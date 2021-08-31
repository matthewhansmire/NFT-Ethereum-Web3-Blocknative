import React, { Component } from 'react';
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import Web3 from 'web3'
import './App.css';
import Marketplace from '../abis/Marketplace.json'
import Navbar from './Navbar'
import Main from './Main'

import { initOnboard, initNotify } from './services'
import getSigner from './signer'

let provider
let marketplaceContract

function App() {
  async function loadWeb3() {
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum)
      await window.ethereum.enable()
    }
    else if (window.web3) {
      window.web3 = new Web3(window.web3.currentProvider)
    }
    else {
      window.alert('Non-Ethereum browser detected. You should consider trying MetaMask!')
    }
  }

  async function loadBlockchainData() {
    const web3 = window.web3
    // Load account
    const accounts = await web3.eth.getAccounts()
    setAccount(accounts[0])
    const networkId = await web3.eth.net.getId()

    const networkData = Marketplace.networks[networkId]
    if (networkData) {
      const marketplace = web3.eth.Contract(Marketplace.abi, networkData.address)
      setMarketplace(marketplace)

      const productCount = await marketplace.methods.productCount().call()
      setProductCount(productCount)
      // Load products
      for (var i = 1; i <= productCount; i++) {
        const product = await marketplace.methods.products(i).call()
        setProducts(products =>
          [...products, product]
        )
      }
      setLoading(false);
    } else {
      window.alert('Marketplace contract not deployed to detected network.')
    }
  }

  const [account, setAccount] = useState(null)
  const [productCount, setProductCount] = useState(0)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [address, setAddress] = useState(null)

  const [marketplace, setMarketplace] = useState(null)

  const [contractAddress, setContractAddress] = useState(null)
  const [ens, setEns] = useState(null)
  const [network, setNetwork] = useState(null)
  const [balance, setBalance] = useState(null)
  const [wallet, setWallet] = useState({})

  const [onboard, setOnboard] = useState(null)
  const [notify, setNotify] = useState(null)

  useEffect(async () => {
    await loadWeb3()
    await loadBlockchainData()

    const onboard = initOnboard({
      address: setAddress,
      ens: setEns,
      network: setNetwork,
      balance: setBalance,
      wallet: wallet => {
        if (wallet.provider) {
          setWallet(wallet)

          const ethersProvider = new ethers.providers.Web3Provider(
            wallet.provider
          )

          provider = ethersProvider

          marketplaceContract = new ethers.Contract(
            '0x9ae7B1d535e82AF09b75E9ADDEBA7239B52498E4',
            Marketplace.abi,
            getSigner(ethersProvider)
          )
          setContractAddress(marketplaceContract.address)

          window.localStorage.setItem('selectedWallet', wallet.name)
        } else {
          provider = null
          setWallet({})
        }
      }
    })

    setOnboard(onboard)
    setNotify(initNotify())
  }, [])

  useEffect(() => {
    const previouslySelectedWallet = window.localStorage.getItem(
      'selectedWallet'
    )

    if (previouslySelectedWallet && onboard) {
      onboard.walletSelect(previouslySelectedWallet)
    }
  }, [onboard])

  function createProduct(name, image, price) {
    setLoading(true);
    marketplace.methods.createProduct(name, image, price, marketplace.address).send({ from: account })
      .once('transactionHash', (transactionHash) => {
        setLoading(false);
        console.log('hashresult', transactionHash)
        if(transactionHash){
          window.alert('Transaction Successfully Done!')
        }
        else {
          window.alert('Transaction Failed.')
        }
        window.location.reload();
      })

    // let callPromise = marketplace.createProduct(name, image, price, contractAddress);
    // callPromise.then(function (result) {
    // console.log(result)
    // const { emitter } = notify.hash(result.hash)
    // emitter.on('txSent', console.log)
    // emitter.on('txPool', console.log)
    // emitter.on('txConfirmed', console.log)
    // emitter.on('txSpeedUp', console.log)
    // emitter.on('txCancel', console.log)
    // emitter.on('txFailed', console.log)
    // })
  }

  function purchaseProduct(id, price) {
    setLoading(true)
    marketplace.methods.purchaseProduct(id, marketplace.address).send({ from: account, value: price })
      .once('transactionHash', (transactionHash) => {
        setLoading(false)
        window.location.reload();
      })
  }

  return (
    <div>
      {/* <Navbar account={account} contract={address} /> */}
      <Navbar account={address} contract={contractAddress} />

      <div className="container">
        <h2>Onboarding Users with Onboard</h2>
        <div>
          {!wallet.provider && (
            <button
              className="bn-demo-button"
              onClick={() => {
                onboard.walletSelect()
              }}
            >
              Select a Wallet
            </button>
          )}

          {wallet.provider && (
            <button className="bn-demo-button" onClick={onboard.walletCheck}>
              Wallet Checks
            </button>
          )}

          {wallet.provider && (
            <button className="bn-demo-button" onClick={onboard.walletSelect}>
              Switch Wallets
            </button>
          )}

          {wallet.provider && (
            <button className="bn-demo-button" onClick={onboard.walletReset}>
              Reset Wallet State
            </button>
          )}
          {wallet.provider && wallet.dashboard && (
            <button className="bn-demo-button" onClick={wallet.dashboard}>
              Open Wallet Dashboard
            </button>
          )}
          {wallet.provider && wallet.type === 'hardware' && address && (
            <button
              className="bn-demo-button"
              onClick={onboard.accountSelect}
            >
              Switch Account
            </button>
          )}
        </div>
      </div>

      <div className="container-fluid mt-5">
        <div className="row">
          <main role="main" className="col-lg-12 d-flex">
            {loading
              ? <div id="loader" className="text-center"><p className="text-center">Loading...</p></div>
              : <Main
                products={products}
                createProduct={createProduct}
                purchaseProduct={purchaseProduct} />
            }
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
