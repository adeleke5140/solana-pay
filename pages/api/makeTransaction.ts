import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import {
  clusterApiUrl,
  Connection,
  PublicKey,
  Keypair,
  Transaction,
} from '@solana/web3.js'
import { NextApiRequest, NextApiResponse } from 'next'
import { shopAddress, usdcAddress, couponAddress } from '../../lib/addresses'
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  getMint,
  getOrCreateAssociatedTokenAccount,
} from '@solana/spl-token'
import base58 from 'bs58'
import calculatePrice from '../../lib/calculatePrice'

export type MakeTransactionInputData = {
  account: string
}

type MakeTransactionGetResponse = {
  label: string
  icon: string
}

export type MakeTransactionOutputData = {
  transaction: string
  message: string
}

type ErrorOutput = {
  error: string
}

function get(res: NextApiResponse<MakeTransactionGetResponse>) {
  res.status(200).json({
    label: 'Cookies Inc',
    icon: 'https://freesvg.org/img/1547869765.png',
  })
}

async function post(
  req: NextApiRequest,
  res: NextApiResponse<MakeTransactionOutputData | ErrorOutput>
) {
  try {
    const amount = calculatePrice(req.query)
    if (amount.toNumber() === 0) {
      res.status(400).json({ error: "Can't checkout with charge of 0" })
      return
    }

    const { reference } = req.query
    if (!reference) {
      res.status(400).json({ error: 'No reference provided' })
      return
    }

    const { account } = req.body as MakeTransactionInputData
    if (!account) {
      res.status(400).json({ error: 'No account provided' })
      return
    }

    const shopPrivateKey = process.env.SHOP_PRIVATE_KEY as string
    if (!shopPrivateKey) {
      res.status(500).json({ error: 'Shop private key is not available' })
    }

    const shopKeypair = Keypair.fromSecretKey(base58.decode(shopPrivateKey))

    const buyerPublicKey = new PublicKey(account)
    const shopPublicKey = shopKeypair.publicKey

    const network = WalletAdapterNetwork.Devnet
    const endpoint = clusterApiUrl(network)
    const connection = new Connection(endpoint)

    const buyerCouponAddress = await getOrCreateAssociatedTokenAccount(
      connection,
      shopKeypair,
      couponAddress,
      buyerPublicKey
    ).then((account) => account.address)

    const buyerCouponAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      shopKeypair,
      couponAddress,
      buyerPublicKey
    )

    const shopCouponAddress = await getAssociatedTokenAddress(
      couponAddress,
      shopPublicKey
    )

    const buyerGetsCouponDiscount = buyerCouponAccount.amount >= 5

    const usdcMint = await getMint(connection, usdcAddress)

    const buyerUsdcAddress = await getAssociatedTokenAddress(
      usdcAddress,
      buyerPublicKey
    )
    const shopUsdcAddress = await getAssociatedTokenAddress(
      usdcAddress,
      shopPublicKey
    )

    const { blockhash } = await connection.getLatestBlockhash('finalized')

    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: buyerPublicKey,
    })

    const amountToPay = buyerGetsCouponDiscount ? amount.dividedBy(2) : amount

    const transferInstruction = createTransferCheckedInstruction(
      buyerUsdcAddress,
      usdcAddress,
      shopUsdcAddress,
      buyerPublicKey,
      amountToPay.toNumber() * 10 ** usdcMint.decimals,
      usdcMint.decimals
    )

    transferInstruction.keys.push({
      pubkey: new PublicKey(reference),
      isSigner: false,
      isWritable: false,
    })

    // const couponInstruction = createTransferCheckedInstruction(
    //   shopCouponAddress,
    //   couponAddress,
    //   buyerCouponAddress,
    //   shopPublicKey,
    //   1,
    //   0
    // )

    const couponInstruction = buyerGetsCouponDiscount
      ? createTransferCheckedInstruction(
          buyerCouponAccount.address,
          couponAddress,
          shopCouponAddress,
          buyerPublicKey,
          5,
          0
        )
      : createTransferCheckedInstruction(
          shopCouponAddress,
          couponAddress,
          buyerCouponAccount.address,
          shopPublicKey,
          1,
          0
        )

    couponInstruction.keys.push({
      pubkey: shopPublicKey,
      isSigner: true,
      isWritable: false,
    })

    transaction.add(transferInstruction, couponInstruction)

    transaction.partialSign(shopKeypair)

    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
    })

    const base64 = serializedTransaction.toString('base64')

    const message = buyerGetsCouponDiscount
      ? '50% Discount! 🍚'
      : 'Thanks for your order! 🍚'

    res.status(200).json({
      transaction: base64,
      message,
    })
  } catch (err) {
    console.error(err)

    res.status(500).json({ error: 'error creating transaction' })
    return
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    MakeTransactionGetResponse | MakeTransactionOutputData | ErrorOutput
  >
) {
  if (req.method === 'GET') {
    return get(res)
  } else if (req.method === 'POST') {
    return await post(req, res)
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}
