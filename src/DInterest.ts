import { BigDecimal, BigInt, Address, ByteArray, crypto, ethereum } from "@graphprotocol/graph-ts";
import {
  DInterest,
  EDeposit,
  EFund,
  EPayFundingInterest,
  ERolloverDeposit,
  ESetParamAddress,
  ESetParamUint,
  ETopupDeposit,
  EWithdraw,
  OwnershipTransferred
} from "../generated/gDAIPool/DInterest";
import { IInterestOracle } from "../generated/gDAIPool/IInterestOracle";
import { DPool } from "../generated/schema";

let YEAR = BigInt.fromI32(31556952); // One year in seconds
let ZERO_DEC = BigDecimal.fromString('0');
let ONE_DEC = BigDecimal.fromString('1');
let NEGONE_DEC = BigDecimal.fromString('-1');
let BLOCK_HANDLER_INTERVAL = BigInt.fromI32(20); // call block handler every 20 blocks

// Note: the addresses below must be in lower case
let POOL_ADDRESSES = new Array<string>(0);

POOL_ADDRESSES.push("0xc0710b3564fd4768f912150d39d519b66f2952d4"); // gDAI
POOL_ADDRESSES.push("0xd62f71937fca1c7c05da08cec4c451f12fc64964"); // gUSDC
POOL_ADDRESSES.push("0xbdf43e9c6cf68359deff9292098622643ede5ec3"); // gUSDT
POOL_ADDRESSES.push("0xcb29ce2526ff5f80ad1536c6a1b13238d615b4b9"); // gWBTC
POOL_ADDRESSES.push("0x7e4697f650934ea6743b8b0619fc2454db02405a"); // gWETH
POOL_ADDRESSES.push("0x23fe5a2ba80ea2251843086ec000911cfc79c864"); // gWFTM

POOL_ADDRESSES.push("0xa78276c04d8d807feb8271fe123c1f94c08a414d"); // scDAI
POOL_ADDRESSES.push("0xc7cbb403d1722ee3e4ae61f452dc36d71e8800de"); // scFUSD
POOL_ADDRESSES.push("0xc80cc61910c6f8f47aadc69e40ab8d1b2fa2c4df"); // scLINK
POOL_ADDRESSES.push("0xf7fb7f095c8d0f4ee8ffbd142fe0b311491b45f3"); // scUSDC
POOL_ADDRESSES.push("0x3cab1cb5a9b68350b39ddf7ce23518d609a8bc78"); // scUSDT
POOL_ADDRESSES.push("0xa1857578cec558eaed9120739b0c533549bdcb61"); // scWBTC
POOL_ADDRESSES.push("0x2744b79c985ae0c6b81f1da8eed1a4c67eb4b732"); // scWETH
POOL_ADDRESSES.push("0xc91c2255525e80630eee710e7c0637bce7d98978"); // scWFTM


let POOL_STABLECOIN_DECIMALS = new Array<i32>(0);

POOL_STABLECOIN_DECIMALS.push(18); // gDAI
POOL_STABLECOIN_DECIMALS.push(6); // gUSDC
POOL_STABLECOIN_DECIMALS.push(6); // gUSDT
POOL_STABLECOIN_DECIMALS.push(8); // gWBTC
POOL_STABLECOIN_DECIMALS.push(18); // gWETH
POOL_STABLECOIN_DECIMALS.push(18); // gWFTM

POOL_STABLECOIN_DECIMALS.push(18); // scDAI
POOL_STABLECOIN_DECIMALS.push(18); // scFUSD
POOL_STABLECOIN_DECIMALS.push(18); // scLINK
POOL_STABLECOIN_DECIMALS.push(6); // scUSDC
POOL_STABLECOIN_DECIMALS.push(6); // scUSDT
POOL_STABLECOIN_DECIMALS.push(8); // scWBTC
POOL_STABLECOIN_DECIMALS.push(18); // scWETH
POOL_STABLECOIN_DECIMALS.push(18); // scWFTM

let POOL_DEPLOY_BLOCKS = new Array<i32>(0);

POOL_DEPLOY_BLOCKS.push(18889117); // gDAI
POOL_DEPLOY_BLOCKS.push(18889417); // gUSDC
POOL_DEPLOY_BLOCKS.push(18890761); // gUSDT
POOL_DEPLOY_BLOCKS.push(18892290); // gWBTC
POOL_DEPLOY_BLOCKS.push(18892637); // gWETH
POOL_DEPLOY_BLOCKS.push(18893039); // gWFTM

POOL_DEPLOY_BLOCKS.push(18879417); // scDAI
POOL_DEPLOY_BLOCKS.push(18884783); // scFUSD
POOL_DEPLOY_BLOCKS.push(18881458); // scLINK
POOL_DEPLOY_BLOCKS.push(18880293); // scUSDC
POOL_DEPLOY_BLOCKS.push(18880563); // scUSDT
POOL_DEPLOY_BLOCKS.push(18880796); // scWBTC
POOL_DEPLOY_BLOCKS.push(18881097); // scWETH
POOL_DEPLOY_BLOCKS.push(18884993); // scWFTM

export function keccak256(s: string): ByteArray {
  return crypto.keccak256(ByteArray.fromUTF8(s));
}

export function tenPow(exponent: number): BigInt {
  let result = BigInt.fromI32(1);
  for (let i = 0; i < exponent; i++) {
    result = result.times(BigInt.fromI32(10));
  }
  return result;
}

export function normalize(i: BigInt, decimals: number = 18): BigDecimal {
  return i.toBigDecimal().div(new BigDecimal(tenPow(decimals)));
}

export function getPool(poolAddress: string): DPool {
  let pool = DPool.load(poolAddress);
  if (pool == null) {
    pool = new DPool(poolAddress);
    let poolContract = DInterest.bind(Address.fromString(poolAddress));

    pool.address = poolAddress;
    pool.moneyMarket = poolContract.moneyMarket().toHex();
    pool.stablecoin = poolContract.stablecoin().toHex();
    pool.interestModel = poolContract.interestModel().toHex();
    pool.oneYearInterestRate = ZERO_DEC;
    pool.oracleInterestRate = ZERO_DEC;
    pool.surplus = ZERO_DEC;

    pool.save();
  }
  return pool as DPool;
}

export function handleEDeposit(event: EDeposit): void {}

export function handleEFund(event: EFund): void {}

export function handleEPayFundingInterest(event: EPayFundingInterest): void {}

export function handleERolloverDeposit(event: ERolloverDeposit): void {}

export function handleESetParamAddress(event: ESetParamAddress): void {
  let pool = getPool(event.address.toHex());
  let paramName = event.params.paramName;
  if (paramName == keccak256("interestModel")) {
    pool.interestModel = event.params.newValue.toHex();
  }
  pool.save();
}

export function handleESetParamUint(event: ESetParamUint): void {}

export function handleETopupDeposit(event: ETopupDeposit): void {}

export function handleEWithdraw(event: EWithdraw): void {}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {}

export function handleBlock(block: ethereum.Block): void {
  if (block.number.mod(BLOCK_HANDLER_INTERVAL).isZero()) {
    let blockNumber = block.number.toI32();
    for (let i = 0; i < POOL_ADDRESSES.length; i++) {
      if (blockNumber >= POOL_DEPLOY_BLOCKS[i]) {

        let poolID = POOL_ADDRESSES[i];
        let pool = getPool(poolID);
        let poolContract = DInterest.bind(Address.fromString(pool.address));
        let stablecoinDecimals: number = POOL_STABLECOIN_DECIMALS[i];
        let oracleContract = IInterestOracle.bind(poolContract.interestOracle());

        let oneYearInterestRate = poolContract.try_calculateInterestAmount(tenPow(18), YEAR);
        pool.oneYearInterestRate = oneYearInterestRate.reverted
          ? ZERO_DEC
          : normalize(oneYearInterestRate.value)

        let oracleInterestRate = oracleContract.try_updateAndQuery();
        pool.oracleInterestRate = oracleInterestRate.reverted
          ? ZERO_DEC
          : normalize(oracleInterestRate.value.value1)

        let surplusResult = poolContract.try_surplus();
        pool.surplus = surplusResult.reverted
          ? ZERO_DEC
          : normalize(surplusResult.value.value1, stablecoinDecimals).times(surplusResult.value.value0 ? NEGONE_DEC : ONE_DEC)

        pool.save();

      }
    }
  }
}
