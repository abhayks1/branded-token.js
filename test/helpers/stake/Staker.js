'use strict';

// Load external packages
const chai = require('chai'),
  Web3 = require('web3'),
  Package = require('../../../index');

const Setup = Package.EconomySetup,
  OrganizationHelper = Setup.OrganizationHelper,
  assert = chai.assert,
  config = require('../../utils/configReader'),
  Web3WalletHelper = require('../../utils/Web3WalletHelper'),
  StakeHelper = require('../../../lib/helpers/stake/gateway_composer/StakeHelper'),
  Staker = require('../../../lib/helpers/stake/gateway_composer/Staker'),
  MockContractsDeployer = require('../../utils/MockContractsDeployer'),
  abiBinProvider = MockContractsDeployer.abiBinProvider(),
  BTHelper = Package.EconomySetup.BrandedTokenHelper,
  GCHelper = Setup.GatewayComposerHelper,
  KeepAliveConfig = require('../../utils/KeepAliveConfig');

const web3 = new Web3(config.gethRpcEndPoint),
  web3WalletHelper = new Web3WalletHelper(web3),
  owner = config.deployerAddress;

let worker,
  caOrganization = null,
  caMockToken,
  caGC,
  wallets,
  stakeRequestHash,
  gatewayComposerAddress,
  facilitator,
  beneficiary,
  btStakeStruct,
  caBT,
  deployer,
  caGateway,
  btAddress;

const valueTokenInWei = '200',
  gasPrice = '8000000',
  gasLimit = '100',
  txOptions = {
    from: owner,
    gas: '8000000'
  };

describe('Staker', async function() {
  let deployParams = {
    from: config.deployerAddress,
    gasPrice: config.gasPrice
  };

  before(function() {
    this.timeout(3 * 60000);

    return web3WalletHelper
      .init(web3)
      .then(function(_out) {
        if (!caOrganization) {
          console.log('* Setting up Organization');
          wallets = web3WalletHelper.web3Object.eth.accounts.wallet;
          worker = wallets[1].address;
          beneficiary = wallets[2].address;
          facilitator = wallets[3].address;
          let orgHelper = new OrganizationHelper(web3, caOrganization);
          const orgConfig = {
            deployer: config.deployerAddress,
            owner: owner,
            workers: worker,
            workerExpirationHeight: '20000000'
          };
          return orgHelper.setup(orgConfig).then(function() {
            caOrganization = orgHelper.address;
          });
        }
        return _out;
      })
      .then(function() {
        if (!caMockToken) {
          deployer = new MockContractsDeployer(config.deployerAddress, web3);
          return deployer.deployMockToken().then(function() {
            caMockToken = deployer.addresses.MockToken;
            return caMockToken;
          });
        }
      });
  });

  it('Completes staker.requestStake successfully', async function() {
    this.timeout(4 * 60000);

    const helperConfig = {
      deployer: config.deployerAddress,
      valueToken: caMockToken,
      symbol: 'BT',
      name: 'MyBrandedToken',
      decimals: '18',
      conversionRate: '1000',
      conversionRateDecimals: 5,
      organization: caOrganization
    };

    const btHelper = new BTHelper(web3, caBT);
    caBT = await btHelper.setup(helperConfig, deployParams);
    btAddress = caBT.contractAddress;

    const gcHelperConfig = {
      deployer: config.deployerAddress,
      valueToken: caMockToken,
      brandedToken: btAddress,
      owner: owner
    };

    let gcDeployParams = {
      from: config.deployerAddress,
      gasPrice: config.gasPrice
    };

    let gcHelper = new GCHelper(web3, caGC),
      gatewayComposerInstance = await gcHelper.setup(gcHelperConfig, gcDeployParams);

    gatewayComposerAddress = gatewayComposerInstance.contractAddress;

    const mockTokenAbi = abiBinProvider.getABI('MockToken');

    await deployer.deployMockGatewayPass();
    caGateway = deployer.addresses.MockGatewayPass;

    const stakeHelperInstance = new StakeHelper(web3, btAddress, gatewayComposerAddress),
      mintBTAmountInWei = await stakeHelperInstance.convertToBTToken(valueTokenInWei, btAddress, web3, txOptions),
      stakerGatewayNonce = 1;

    const stakerInstance = new Staker(web3, caMockToken, btAddress, gatewayComposerAddress);
    await stakerInstance.requestStake(
      mockTokenAbi,
      owner,
      valueTokenInWei,
      mintBTAmountInWei,
      caGateway,
      gasPrice,
      gasLimit,
      beneficiary,
      stakerGatewayNonce,
      txOptions
    );

    stakeRequestHash = await stakeHelperInstance._getStakeRequestHashForStakerRawTx(
      gatewayComposerAddress,
      web3,
      txOptions
    );

    btStakeStruct = await stakeHelperInstance._getStakeRequestRawTx(stakeRequestHash, web3, txOptions);
    assert.strictEqual(gatewayComposerAddress, btStakeStruct.staker, 'Incorrect staker address');
  });
});

KeepAliveConfig.get();
