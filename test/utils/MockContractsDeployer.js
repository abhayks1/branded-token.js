'use strict';

//__NOT_FOR_WEB__BEGIN__
const fs = require('fs'),
  path = require('path');
//__NOT_FOR_WEB__END__

const Package = require('../../index');
const AbiBinProvider = Package.AbiBinProvider;

const mockAbiFolder = path.resolve(__dirname, './mock-contracts/abi');
const mockBinFolder = path.resolve(__dirname, './mock-contracts/bin');
console.log(mockAbiFolder);
console.log(mockBinFolder);
class MockContractsDeployer {
  constructor(deployer, web3) {
    const oThis = this;
    oThis.web3 = web3;
    oThis.deployer = deployer;
    oThis.abiBinProvider = MockContractsDeployer.abiBinProvider();

    oThis.addresses = {};
  }

  deployMockToken(web3, txOptions) {
    const oThis = this;
    return oThis.deploy('MockToken', web3, txOptions);
  }

  deployMockGatewayPass(web3, txOptions) {
    const oThis = this;
    return oThis.deploy('MockGatewayPass', web3, txOptions);
  }

  deploy(contractName, web3, txOptions) {
    const oThis = this;
    web3 = web3 || oThis.web3;
    const abiBinProvider = oThis.abiBinProvider;
    const abi = abiBinProvider.getABI(contractName);
    const bin = abiBinProvider.getBIN(contractName);

    let defaultOptions = {
      from: oThis.deployer,
      gas: '7500000',
      gasPrice: '0x5B9ACA00'
    };

    if (txOptions) {
      Object.assign(defaultOptions, txOptions);
    }
    txOptions = defaultOptions;

    let args = [];
    const contract = new web3.eth.Contract(abi, null, txOptions);
    let tx = contract.deploy(
      {
        data: bin,
        arguments: args
      },
      txOptions
    );

    console.log(`* Deploying ${contractName} Contract`);
    let txReceipt;
    return tx
      .send(txOptions)
      .on('transactionHash', function(transactionHash) {
        console.log('\t - transaction hash:', transactionHash);
      })
      .on('error', function(error) {
        console.log('\t !! Error !!', error, '\n\t !! ERROR !!\n');
        return Promise.reject(error);
      })
      .on('receipt', function(receipt) {
        txReceipt = receipt;
        console.log('\t - Receipt:\n\x1b[2m', JSON.stringify(receipt), '\x1b[0m\n');
      })
      .then(function(instance) {
        oThis.addresses[contractName] = instance.options.address;
        console.log(`\t - ${contractName} Contract Address:`, instance.options.address);
        return txReceipt;
      });
  }

  static abiBinProvider() {
    return new AbiBinProvider(mockAbiFolder, mockBinFolder);
  }
}

module.exports = MockContractsDeployer;
