import React, { Component } from 'react'
import PicWitnessContract from '../build/contracts/PicWitness.json'
import getWeb3 from './utils/getWeb3'
import ipfs from './utils/IPFS'
import moment from './utils/moment'

import './css/oswald.css'
import './css/open-sans.css'
import './css/pure-min.css'
import './css/grids-responsive-min.css'
import './App.css'

class App extends Component {
  constructor(props) {
    super(props)

    this.state = {
      web3: null,
      picWitnessInstance: null,
      account: null,
      pictureCount: 0,
      pictures: [],
      buffer: null,
      currentPictureDescription: ''
    }
    this.onGetPictureToAdd = this.onGetPictureToAdd.bind(this);
    this.onAddDescription = this.onAddDescription.bind(this);
    this.onAddPicture = this.onAddPicture.bind(this);
    this.onInputChanged = this.onInputChanged.bind(this);
  }

  componentWillMount() {
    // Get network provider and web3 instance.
    // See utils/getWeb3 for more info.

    getWeb3
    .then(results => {
      this.setState({
        web3: results.web3
      })

      // Instantiate contract once web3 provided.
      this.instantiateContract()
    })
    .catch(() => {
      console.log('Error finding web3.')
    })
  }

  instantiateContract() {
    const contract = require('truffle-contract')
    const picWitness = contract(PicWitnessContract)
    picWitness.setProvider(this.state.web3.currentProvider)

    this.state.web3.eth.getAccounts((error, accounts) => {
      picWitness.deployed().then((instance) => {
        this.setState({ picWitnessInstance: instance })
        console.log('Contract deployed to ' + this.state.picWitnessInstance.address)
        this.setState({ account: accounts[0] })
        console.log('Using account ' + this.state.account)
      }).then(() => {
        this.getPictureCount()
      })
    })
  }

  getPictureCount() {
    this.state.picWitnessInstance.getUserPictureCount.call().then((result) => {
      var currentCount = this.state.pictureCount
      var newCount = parseInt(result, 10)
      this.setState({ pictureCount: newCount })
      if (currentCount !== newCount) {
        this.getPictures()
      }
    })
  }

  getPictures() {
    if (this.state.pictureCount > 0) {
      for (var i = 0; i < this.state.pictureCount; i++) {
        console.log("Getting picture by index " + i)
        this.state.picWitnessInstance.getPictureHash.call(i.toString())
        .then((pictureHash) => {
          console.log("Got picture: " + pictureHash)
          this.state.picWitnessInstance.getPictureDetails.call(pictureHash)
          .then((pictureDetails) => {
            this.setState({
              pictures: this.state.pictures.concat({
                hash: pictureHash,
                description: pictureDetails[0],
                timestamp: moment(pictureDetails[1]).format('LL')
              })
            })
          })
        })
      }
    }
  }

  onGetPictureToAdd(event) {
    event.preventDefault()
    const picture = event.target.files[0]
    const reader = new window.FileReader()
    reader.readAsArrayBuffer(picture)
    reader.onloadend = () => {
      this.setState({ buffer: Buffer(reader.result) })
      console.log('buffer', this.state.buffer)
    }
  }

  onAddPicture(event) {
    event.preventDefault()
    console.log('Submitting...')

    // TODO Figure out a way to eliminate these extra variables (can't access this.state from within file add)
    const buffer = this.state.buffer
    const instance = this.state.picWitnessInstance
    const account = this.state.account

    ipfs.files.add(buffer, function (error, files) {
      if(error) {
        console.log(error)
        return
      }

      const hash = files[0].hash

      console.log('Picture sent to IPFS. Hash: ' + hash)
      
      instance.addPicture(hash, { from: account }).then((r) => {
        console.log('ifpsHash', hash)
      })
    })
    
    this.getPictureCount()
  }

  onAddDescription(event) {
    event.preventDefault()
    this.state.picWitnessInstance.addPictureDescription(
      event.target.id,
      this.state.currentPictureDescription,
      { from: this.state.account })
    .then(() => {
      this.getPictureCount()
    })
  }

  onInputChanged(event) {
    this.setState({ [event.target.name]: event.target.value })
  }

  render() {
    const { buffer } = this.state;
    const isAddPictureEnabled = buffer !== null
    return (
      <div className="App">
        <nav className="navbar pure-menu pure-menu-horizontal">
            <a href="#" className="pure-menu-heading pure-menu-link">PicWitness</a>
        </nav>

        <main className="container">
          <div className="pure-g">
            <div className="pure-u-1-1">
              <div className="pure-g">
                <div className="pure-u-1 pure-u-md-1-3">
                  <h2>Add a Picture</h2>
                  <form onSubmit={this.onAddPicture} >
                    <input type='file' onChange={this.onGetPictureToAdd} />
                    <button type='submit' className="pure-button pure-button-primary"
                      disabled={!isAddPictureEnabled}>
                      Go!
                    </button>
                  </form>
                </div>
                <div className="pure-u-1 pure-u-md-2-3">
                <h2>How this works</h2>
                  <p>Choose a picture to upload. Your picture will be timstampped
                    and submitted to a peer-to-peer filesharing network called InterPlanetary 
                    File System (IPFS). After your picture is stored using IPFS, a file hash 
                    provided by IPFS will be added to the Ethereum blockchain. This blockchain 
                    transaction provides cryptographically-guaranteed proof that you added
                    the picture at a certain date/time.
                  </p>
                </div>
              </div>
              <h2>Your pictures: {this.state.pictureCount}</h2>
              <div className="pure-g">
                {this.state.pictures.map((picture, index) => (
                  <div className="pure-u-1 pure-u-lg-1-3 pure-u-xl-1-4" key={index}>
                    <div className="pure-grid-unit-p1">
                      <span>{picture.description}</span><br />
                      <form>
                        <input type="text" name="currentPictureDescription" 
                          onChange={this.onInputChanged} placeholder="Description" />
                        <button onClick={this.onAddDescription} id={picture.hash}
                          className="pure-button button-success button-small">
                          Save
                        </button>
                      </form>
                      <span className="smaller-muted">Added on {picture.timestamp}</span>
                      <img src={`https://ipfs.io/ipfs/${picture.hash}`} alt="" className="pure-img"/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }
}

export default App
