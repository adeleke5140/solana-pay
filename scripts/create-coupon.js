import {
  createAssociatedTokenAccount,
  createMint,
  getAccount,
  mintToChecked,
} from '@solana/spl-token'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { clusterApiUrl, Connection, Keypair } from '@solana/web3.js'
import base58 from 'bs58'

import 'dotenv/config'

const network = WalletAdapterNetwork.Devnet
const endpoint = clusterApiUrl(network)
const connection = new Connection(endpoint)

const shopPrivateKey = process.env.SHOP_PRIVATE_KEY
console.log(shopPrivateKey)
if (!shopPrivateKey) {
  throw new Error('SHOP_PRIVATE_KEY not set')
}

const shopAccount = Keypair.fromSecretKey(base58.decode(shopPrivateKey))

console.log('Creating token...')

const myCouponAddress = await createMint(
  connection,
  shopAccount,
  shopAccount.publicKey,
  shopAccount.publicKey,
  0
)

console.log('Token created:', myCouponAddress.toString())

console.log('Creating token account for the shop...')

const shopCouponAddress = await createAssociatedTokenAccount(
  connection,
  shopAccount,
  myCouponAddress,
  shopAccount.publicKey
)

console.log('Token account created:', shopCouponAddress.toString())

console.log('Minting 1 million coupons to the shop account...')

await mintToChecked(
  connection,
  shopAccount,
  myCouponAddress,
  shopCouponAddress,
  shopAccount,
  1_000_000,
  0
)

console.log('Minted 1 million coupons to the shop account')

const { amount } = await getAccount(connection, shopCouponAddress)
console.log({
  myCouponAddress: myCouponAddress.toString(),
  balance: amount.toLocaleString(),
})
