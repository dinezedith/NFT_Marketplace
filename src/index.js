import { ethers } from 'ethers';
import tokenDetails, { transferProxy } from './token';
import { create } from "ipfs-http-client";
const client = create('https://ipfs.infura.io:5001/')

var provider;
var chainId;
var accounts;
var signer;


async function Disconnect() {
  userAddress = '';
  provider = "";
  signer = "";
  document.getElementById('Account').innerHTML = userAddress;
  alert("Disconnected")
}


async function connection() {
  //try {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    accounts = await signer.getAddress();
    console.log("Account:", await signer.getAddress());
    let bal = await balance();
    chainId = await signer.getChainId();
    var Networkname = await provider.getNetwork();
    document.getElementById('Account').innerHTML = accounts;
    document.getElementById('Balance').innerHTML = bal;
    document.getElementById('chainId').innerHTML = chainId
    document.getElementById('network').innerHTML = Networkname.name;
    console.log(`User's address is ${accounts}`)


  // } catch (e) {
  //   console.log(e);
  // }
}

async function getaccounts() {
  try {
    signer = provider.getSigner();
    accounts = await signer.getAddress();
    return accounts;
  } catch (e) {
    console.log(e)
  }
}

async function balance() {
  var bal = await signer.getBalance()
  console.log((bal)/10**18)
  var walletBalance = (bal)/10**18
  document.getElementById('Balance').innerHTML = walletBalance; 
  return walletBalance;
}

async function splitSign(hash) {
  var signature = ethers.utils.splitSignature(hash);
  return signature;
}

async function signMessage(contract721, accounts, tokenURI, nonce) {
  var hash;
  hash = ethers.utils.solidityKeccak256(["address", "address", "string", "uint256"],[contract721, accounts, tokenURI, nonce])
  var msgHash = ethers.utils.arrayify(hash)
  return msgHash
}

async function getContract(contractAddress, abi) {
  var contract = new ethers.Contract(contractAddress, abi, provider);
  var tokenContract = contract.connect(signer); 
  return tokenContract;
}

async function mint721() {
  let src = document.getElementById("image").files[0];
  const { cid } = await client.add(src);
  const tokenURI = cid.toString();
  var contract721 = await getContract(tokenDetails.contract721Address, tokenDetails.abi721);
  if(!(await contract721.isApprovedForAll(accounts, tokenDetails.transferProxy))) {
      approveNFT();
  }
  var nonce = Math.floor(new Date().getTime() / 1000);
  let msgHash = await signMessage(tokenDetails.contract721Address, accounts, tokenURI, nonce);
  let wallet = new ethers.Wallet(tokenDetails.privateKey, provider)
  var hash = await wallet.signMessage(msgHash);
  var sign = await splitSign(hash)
  var tx = await contract721.mint(tokenURI);
  var receipt = await tx.wait();
  tokenID =  parseInt(receipt.events[0].topics[3])
  alert("tokenId" + ':'+ tokenID)
}


async function approveNFT() {
  var contract;
  contract = await getContract(tokenDetails.contract721Address, tokenDetails.abi721);;
  var tokenContract = contract.connect(signer); 
  var tx = await tokenContract.setApprovalForAll(tokenDetails.transferProxy, true);
  var receipt = await tx.wait()

}

async function signSellOrder() {
  let tokenId = document.getElementById("tokenId").value;
  let unitPrice  = document.getElementById("nftPrice").value;
  unitPrice = (unitPrice * 10 ** 18).toString();
  var nftAddress;
  nftAddress = tokenDetails.contract721Address
  let nonce = Math.floor(new Date().getTime() / 1000);
  console.log([nftAddress, tokenId, tokenDetails.erc20PaymentAddress, unitPrice, nonce])
  var hash = ethers.utils.solidityKeccak256(["address", "uint256", "address", "uint256", "uint256"],[nftAddress, tokenId, tokenDetails.erc20PaymentAddress, unitPrice, nonce])
  var msgHash = ethers.utils.arrayify(hash)
  var signHash = await signer.signMessage(msgHash);
  var sign = await splitSign(signHash)
  console.log(sign.v ,sign.r ,sign.s ,nonce)
  alert("V"+ ':'+ sign.v + ','+ "\nR" + ':'+ sign.r + ','+ "\nS" + ':'+ sign.s + ','+ "\nNonce", + ':'+ nonce)

}


async function bidSign() {
  let tokenId = document.getElementById("tokenId").value;
  let unitPrice  = document.getElementById("nftPrice").value
  let qty  = document.getElementById("quantity").value
  unitPrice = unitPrice * 10 ** 18;
  var nftAddress;
  let amount = (unitPrice + (unitPrice * 2.5 / 100)).toString()
  let proxy;
  nftAddress = tokenDetails.contract721Address
  proxy = tokenDetails.transferProxy
  if(!(await contract721.isApprovedForAll(accounts, tokenDetails.transferProxy))) {
    approveNFT();
  }
  await deposit(amount)
  await approveERC20(proxy,amount)


  let nonce = Math.floor(new Date().getTime() / 1000);

  console.log(nftAddress, tokenId, tokenDetails.erc20PaymentAddress, amount, qty, nonce)
  var hash = ethers.utils.solidityKeccak256(["address", "uint256", "address", "uint256", "uint256", "uint256"],[nftAddress, tokenId, tokenDetails.erc20PaymentAddress, amount, qty, nonce])
  var msgHash = ethers.utils.arrayify(hash)
  var signHash = await signer.signMessage(msgHash);
  var sign = await splitSign(signHash)
  console.log(sign.v ,sign.r ,sign.s ,nonce)

}


async function deposit(amount) {
  var contract = await getContract(tokenDetails.erc20PaymentAddress, tokenDetails.weth);
  var tx = await contract.deposit({value: amount})
  await tx.wait()
}

async function approveERC20(contractAddress, amount) {
  var contract = await getContract(tokenDetails.erc20PaymentAddress, tokenDetails.weth);
  var tx = await contract.approve(contractAddress, amount)
  await tx.wait()

}

async function buyAsset() {

  var sign;
  let type = document.getElementById("buynftType").value;
  let tokenID = document.getElementById("buytokenId").value;
  let unitPrice  = document.getElementById("buynftPrice").value;
  sign = JSON.parse(document.getElementById("buysignValue").value);
  console.log(sign)
  let assetOwner = document.getElementById("buysellerAddress").value;
  let qty = document.getElementById("buyquantity").value;

  unitPrice = (unitPrice * 10 ** 18).toString();
  let amount = (Number(unitPrice) + Number(unitPrice * 2.5 / 100)).toString();
  let nftAddress;
  let abi;

  await deposit(amount)
  await approveERC20(tokenDetails.transferProxy ,amount)
  nftAddress = tokenDetails.contract721Address
  abi = tokenDetails.abi721

  var orderStruct = [
    assetOwner, 
    accounts,
    tokenDetails.erc20PaymentAddress,
    nftAddress,
    type,
    unitPrice,
    amount,
    tokenID,
    qty
  ]

  var tokenContract = await getContract(tokenDetails.trade ,tokenDetails.abiTrade);
  var contract = tokenContract.connect(signer); 
  var tx = await contract.buyAsset(orderStruct, sign);
  var receipt = await tx.wait();
  console.log(receipt)

}

async function executeBid() {

  let type = document.getElementById("bidnftType").value;
  let tokenID = document.getElementById("bidtokenId").value;
  let unitPrice  = document.getElementById("bidnftPrice").value;
  let sign = JSON.parse(document.getElementById("bidsignValue").value);
  let buyerAddress = document.getElementById("bidbuyerAddress").value;
  let qty = document.getElementById("bidquantity").value;

  unitPrice = (unitPrice * 10 ** 18).toString();
  let amount = (Number(unitPrice) + Number(unitPrice * 2.5 / 100)).toString();
  let nftAddress;
  let abi;
  nftAddress = tokenDetails.contract721Address
  abi = tokenDetails.abi721
  var orderStruct = [
    accounts, 
    buyerAddress,
    tokenDetails.erc20PaymentAddress,
    nftAddress,
    type,
    unitPrice,
    amount,
    tokenID,
    qty
  ]


var tokenContract = await getContract(tokenDetails.trade ,tokenDetails.abiTrade);
var contract = tokenContract.connect(signer); 
var tx = await contract.executeBid(orderStruct, sign);
var receipt = await tx.wait();
console.log(receipt)

}


function getRandom(address) {
  let value = Date.now() + Math.floor((Math.random() * (10 ** 10)) + 1);
  var hex = value.toString(16);
  hex = hex + address.slice(2);
  return `0x${'0'.repeat(64-hex.length)}${hex}`;
}

async function connectWallet() {
    document.getElementById('connectButton').onclick = connection
    document.getElementById('disConnectButton').onclick = Disconnect
    document.getElementById('Account').onclick = getaccounts
    document.getElementById('Balance').onclick = balance
    document.getElementById('mint721').onclick = mint721
    document.getElementById('signseller').onclick = signSellOrder
    document.getElementById('signbid').onclick = bidSign
    document.getElementById('buy').onclick = buyAsset
    document.getElementById('bid').onclick = executeBid
}

connectWallet();
