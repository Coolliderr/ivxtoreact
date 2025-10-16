// src/contract.js —— BSC (Pancake) 网络，SCK Staking 前端对接（ethers v6）
import { ethers } from "ethers";

/** 目标网络：BSC Mainnet */
export const EXPECTED_CHAIN_ID_HEX = "0x38";

/** —— 代币 & 路由 & 质押合约地址 —— */
export const USDT_ADDRESS   = "0x55d398326f99059fF775485246999027B3197955";
export const SCK_ADDRESS    = "0x18257EDbA420b69Ef26defFa6d41Eaca71a32d4E";
/** Pancake V2 Router */
export const ROUTER_ADDRESS = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
/** 你部署后的 Staking 地址（按你的合约） */
export const STAKING_ADDRESS = "0x7811d16C70d1B44feb8621118E8FA46e3e372184";

/** BSC 链参数（用于 wallet_addEthereumChain） */
const CHAIN_PARAMS = {
  "0x38": {
    chainId: "0x38",
    chainName: "BNB Smart Chain",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    rpcUrls: ["https://bsc-dataseed.binance.org"],
    blockExplorerUrls: ["https://bscscan.com"],
  },
};

/* ============ 基础 ERC20 ABI（最小集） ============ */
export const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function transfer(address to, uint256 value) returns (bool)",
  "function transferFrom(address from, address to, uint256 value) returns (bool)",
];

/* ============ Pancake V2 读价相关 ABI ============ */
const ROUTER_ABI = [
  "function factory() view returns (address)",
  "function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory)",
];
const FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) external view returns (address pair)",
];
const PAIR_ABI = [
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function totalSupply() view returns (uint256)",
];

/* ============ Staking ABI（对齐修改后的合约） ============ */
export const SCK_STAKING_ABI = [
  // 只读
  "function owner() view returns (address)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",      // 本息合计（封顶各自周期复利）
  "function balances(address) view returns (uint256)",       // 仅“本金账本”
  "function SCK() view returns (address)",                   // ISCK public SCK
  "function remainingQuotaOf(address) view returns (uint256)",
  "function pendingUsdtOf(address) view returns (uint256)",
  "function vipLevelOf(address) view returns (tuple(uint8 level, uint256 smallArea))",
  "function bigSmallAreaOf(address user) view returns (uint256 smallArea, uint256 bigArea)",
  "function quoteSckOut(uint256 usdtIn) view returns (uint256)",
  "function stakeCount(address user) view returns (uint256)",
  "function subscriptionCount(address user) view returns (uint256)",
  "function rewardOfSlot(address user, uint8 index) view returns (uint256)",
  "function stakingShareBalanceOf(address u) view returns (uint256)",
  "function isPresale() view returns (bool)",
  "function presaleUsdtSpent(address) view returns (uint256)",

  // 🔹 新增：前端要感知/展示的公开参数
  "function mintEnabled() view returns (bool)",
  "function maxStakeAmount() view returns (uint256)",
  "function presaleUnit() view returns (uint256)",
  "function presaleReleaseDays() view returns (uint16)",
  "function presalePriceSckPerUSDT() view returns (uint256)",
  "function dailyUsdtCap() view returns (uint256)",
  "function dailyUsdtRemain() view returns (uint256)",
  "function dailyRound() view returns (uint256)",
  "function lastDailyOpenAt() view returns (uint256)",
  "function users(address) view returns (uint256 userId, address referrer, bool hasBound, uint256 quota, uint256 totalPerformance, uint256 vipLevel, uint256 pendingMars)",
  "function presaleUpline(address) view returns (address)",

  // 业务函数
  "function bindReferrer(address ref) external",
  // 🔹 新增：预售专用绑定
  "function bindPresaleReferrer(address ref) external",
  "function stake(uint160 amountUSDT, uint256 amountOutMin, uint8 tier) external",
  "function unstake(uint256 index) external returns (uint256)",
  "function subscribe(uint256 usdtSpend, uint16 releaseDays) external returns (uint256 subIndex)",
  "function claim(uint256 subIndex) external returns (uint256 amount)",
  "function claimUsdtRewards() external returns (uint256 amount)",

  // 表格/聚合
  "function getStakeTableOf(address u) external view returns (tuple(uint256 posId,uint256 startTime,uint256 principalUSDT,uint256 theoreticalInterestU,uint256 progressBps,bool canRedeem,bool redeemed)[])",
  "function getSubscribeTableOf(address u) external view returns (tuple(uint256 subId,uint256 startTime,uint256 amountSck,uint8 status)[])",
  "function getAllMySubscriptions(address u) external view returns (tuple(uint256 subId,uint256 startTime,uint256 totalSck,uint256 claimedSck,uint256 claimableNow)[])",

  // Mint Pool 概览
  "function sckPoolCap() view returns (uint256)",
  "function sckMintedTotal() view returns (uint256)",
  "function sckReservedTotal() view returns (uint256)",

  // 权威单条（新增在前端引用）
  "function getPosition(address user, uint256 posId) external view returns (address,address,uint256,uint256,uint8,bool)",

  // === Admin / Ops 读写 ===
  "function setSCK(address _sck) external",
  "function setMarketingAddress(address _account) external",
  "function setTreasury(address t) external",
  "function setPresale(bool enabled) external",
  "function setPresalePrice(uint256 sckPerUsdt_1e18) external",
  "function setVipFloorAndOnlyUp(address user, uint8 level, bool onlyUp) external",
  "function rescueTokens(address token, uint256 amount) external",
  "function setMintingEnabled(bool enabled) external",
  "function setPresaleUnit(uint256 newUnit) external",
  "function setWhitelist(address a, bool v) external",
  "function openDaily() external",
  "function adminUploadOrder(address user, uint160 amount) external",
  "function processOrders(uint256 count) external",
  "function transferOwnership(address newOwner) external",

  // === Admin / Ops 只读 ===
  "function whitelist(address) view returns (bool)",
  "function lastOrderId() view returns (uint256)",
  "function lastProcessedOrderId() view returns (uint256)",
  "function orders(uint256) view returns (uint8 otype, address staker, uint256 amount, uint256 profit, uint256 ts, bool processed)",

  // 事件
  "event Bound(address indexed user, address indexed referrer)",
];

/* ============ Provider / Signer ============ */
function pickInjected() {
  const eth = typeof window !== "undefined" ? window.ethereum : undefined;
  if (!eth) return null;
  if (eth.providers?.length) {
    return (
      eth.providers.find(p => p.isMetaMask) ||
      eth.providers.find(p => p.isOkxWallet || p.isOKExWallet) ||
      eth.providers.find(p => p.isBitKeep || p.isBitgetWallet) ||
      eth.providers[0]
    );
  }
  return eth;
}
export function getInjected() {
  const eth = pickInjected();
  if (!eth) throw new Error("未检测到钱包（MetaMask/OKX/Bitget等）");
  return eth;
}
export function getProvider() {
  return new ethers.BrowserProvider(getInjected());
}
export async function getSigner() {
  return await (new ethers.BrowserProvider(getInjected())).getSigner();
}

/* ============ 切链到 BSC ============ */
export async function ensureChain(chainIdHex = EXPECTED_CHAIN_ID_HEX) {
  const eth = getInjected();
  const cur = await eth.request({ method: "eth_chainId" });
  if (cur === chainIdHex) return;
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainIdHex }] });
  } catch (err) {
    if (err?.code === 4902) {
      const params = CHAIN_PARAMS[chainIdHex];
      if (!params) throw err;
      await eth.request({ method: "wallet_addEthereumChain", params: [params] });
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainIdHex }] });
    } else {
      throw err;
    }
  }
}

/* ============ 判断权限 ============ */
async function assertOwner(signerAddr) {
  const c = await getStaking(true);
  const owner = (await c.owner())?.toLowerCase?.();
  if (!owner) throw new Error("无法读取 owner()");
  if (owner !== signerAddr.toLowerCase()) {
    throw new Error("需要合约所有者权限");
  }
}

/* ============ 合约实例 ============ */
export async function getStaking(readonly = true) {
  if (!STAKING_ADDRESS) throw new Error("请先配置 STAKING_ADDRESS（Staking 部署地址）");
  const provider = getProvider();
  return readonly
    ? new ethers.Contract(STAKING_ADDRESS, SCK_STAKING_ABI, provider)
    : new ethers.Contract(STAKING_ADDRESS, SCK_STAKING_ABI, await getSigner());
}
export async function getErc20(addr, readonly = true) {
  if (!addr) throw new Error("token address required");
  const provider = getProvider();
  return readonly
    ? new ethers.Contract(addr, ERC20_ABI, provider)
    : new ethers.Contract(addr, ERC20_ABI, await getSigner());
}
export async function getUSDT(readonly = true) { return getErc20(USDT_ADDRESS, readonly); }
export async function getSCK(readonly = true)  { return getErc20(SCK_ADDRESS, readonly); }

/* ====== Router / Factory / Pair 辅助 ====== */
export async function getRouter(readonly = true) {
  const provider = getProvider();
  return readonly
    ? new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, provider)
    : new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, await getSigner());
}
export async function getFactory() {
  const router = await getRouter(true);
  const factoryAddr = await router.factory();
  const provider = getProvider();
  return new ethers.Contract(factoryAddr, FACTORY_ABI, provider);
}
/** 获取 SCK–USDT Pair 地址（如果未创建，将返回 0x0000...0000） */
export async function getSckUsdtPairAddress() {
  const f = await getFactory();
  return await f.getPair(SCK_ADDRESS, USDT_ADDRESS);
}
/** 获取 SCK–USDT Pair 合约实例（若不存在将抛错） */
export async function getSckUsdtPair() {
  const pairAddr = await getSckUsdtPairAddress();
  if (!pairAddr || pairAddr === ethers.ZeroAddress) {
    throw new Error("未找到 SCK–USDT LP 对 / Pair 尚未创建");
  }
  const provider = getProvider();
  return new ethers.Contract(pairAddr, PAIR_ABI, provider);
}

/* ============ 常用路径（USDT 直连） ============ */
export const PATH_USDT_TO_SCK  = [USDT_ADDRESS, SCK_ADDRESS];
export const PATH_SCK_TO_USDT  = [SCK_ADDRESS, USDT_ADDRESS];

/* ============ 便捷数值工具 ============ */
export const fmtUnits   = (v, d = 18) => ethers.formatUnits(v ?? 0n, d);
export const parseUnits = (v, d = 18) => ethers.parseUnits(String(v ?? "0"), d);

/* ============ 授权 & 余额 ============ */
export async function ensureAllowance(tokenAddr, owner, spender, amountWei) {
  const token = await getErc20(tokenAddr, true);
  const cur = await token.allowance(owner, spender);
  if (cur >= amountWei) return false;
  const tokenW = await getErc20(tokenAddr, false);
  const tx = await tokenW.approve(spender, amountWei);
  await tx.wait();
  return true;
}
export async function erc20Balance(tokenAddr, user) {
  const t = await getErc20(tokenAddr, true);
  return await t.balanceOf(user);
}
export async function decimalsOf(tokenAddr) {
  const t = await getErc20(tokenAddr, true);
  return await t.decimals();
}

/* ============ 前端动作封装（与合约函数一一对应） ============ */
export async function bindReferrer(refAddr) {
  await ensureChain();
  const c = await getStaking(false);
  const tx = await c.bindReferrer(refAddr);
  return await tx.wait();
}
// 🔹 预售绑定
export async function bindPresaleReferrer(refAddr) {
  await ensureChain();
  const c = await getStaking(false);
  const tx = await c.bindPresaleReferrer(refAddr);
  return await tx.wait();
}

/**
 * 质押 USDT
 * @param {Object} p
 * @param {string|number} p.usdtAmount - 人类单位
 * @param {number} p.tier - 0=1天, 1=15天, 2=30天，默认 2
 * @param {bigint|number|string} p.amountOutMin - 路由换 SCK 的最小接收量（合约二分之一金额去买 SCK）；默认 0
 */
export async function stakeUSDT({ usdtAmount, tier = 2, amountOutMin = 0 }) {
  await ensureChain();
  const signer = await getSigner();
  const from = await signer.getAddress();

  const usdtDec = await decimalsOf(USDT_ADDRESS);
  const amountWei = parseUnits(usdtAmount, usdtDec);
  const minOutWei = BigInt(amountOutMin ?? 0);

  await ensureAllowance(USDT_ADDRESS, from, STAKING_ADDRESS, amountWei);

  const c = await getStaking(false);
  const tx = await c.stake(amountWei, minOutWei, tier);
  return await tx.wait();
}

/** 赎回（按索引） */
export async function redeemPosition(posId) {
  await ensureChain();
  const c = await getStaking(false);
  const tx = await c.unstake(BigInt(posId));
  return await tx.wait();
}

/** 认购（自动适配预售/正式期） */
export async function subscribeSck({ usdtSpend, releaseDays }) {
  await ensureChain();
  const c = await getStaking(true);
  const signer = await getSigner();
  const from = await signer.getAddress();

  // 是否预售
  const presale = await c.isPresale();

  // 计算本次应当花费 & 释放天数
  let spendWei;
  let finalReleaseDays = releaseDays;

  const usdtDec = await decimalsOf(USDT_ADDRESS);

  if (presale) {
    // 预售：忽略外部参数，固定 presaleUnit
    const unit = await c.presaleUnit();
    spendWei = unit;
    // 释放天数为合约内 presaleReleaseDays，仅用于展示
    finalReleaseDays = Number(await c.presaleReleaseDays());
  } else {
    spendWei = parseUnits(usdtSpend, usdtDec);
    // 正式期：releaseDays 应为 30 或 90，由合约校验；这里不强校验只透传
  }

  // 授权
  await ensureAllowance(USDT_ADDRESS, from, STAKING_ADDRESS, spendWei);

  // 发送交易
  const cw = await getStaking(false);
  const tx = await cw.subscribe(spendWei, finalReleaseDays ?? 30);
  return await tx.wait();
}

/** 领取 SCK（认购释放） */
export async function claimSck(subId) {
  await ensureChain();
  const c = await getStaking(false);
  const tx = await c.claim(BigInt(subId));
  return await tx.wait();
}

/** 领取 USDT 动态奖励 */
export async function claimUsdtRewards() {
  await ensureChain();
  const c = await getStaking(false);
  const tx = await c.claimUsdtRewards();
  return await tx.wait();
}

/* ============ 只读便捷方法（前端展示） ============ */
// 待领 USDT 动态奖励（人类数）
export async function pendingUsdtOf(addr) {
  const c = await getStaking(true);
  const raw = await c.pendingUsdtOf(addr); // BigInt (18位)
  const d = await decimalsOf(USDT_ADDRESS);
  return Number(raw ?? 0n) / 10 ** Number(d ?? 18);
}

// 认购额度（USDT 最小单位）
export async function remainingQuotaOf(addr) {
  const c = await getStaking(true);
  return await c.remainingQuotaOf(addr); // BigInt
}

// 单笔最大可质押（合约风控）
export async function maxStakeAmount() {
  const c = await getStaking(true);
  return await c.maxStakeAmount(); // BigInt
}

// 每日认购面板
export async function getDailyPanel() {
  const c = await getStaking(true);
  const [cap, remain, round, openedAt] = await Promise.all([
    c.dailyUsdtCap(),
    c.dailyUsdtRemain(),
    c.dailyRound(),
    c.lastDailyOpenAt(),
  ]);
  return { cap, remain, round, openedAt };
}

// 预售信息（前端展示用）
export async function getPresaleInfo(me) {
  const c = await getStaking(true);
  const [
    isPresale, unit, releaseDays, price1e18, spent,
  ] = await Promise.all([
    c.isPresale(),
    c.presaleUnit(),
    c.presaleReleaseDays(),
    c.presalePriceSckPerUSDT(),
    me ? c.presaleUsdtSpent(me) : 0n,
  ]);
  return { isPresale, unit, releaseDays, price1e18, spent };
}

// 我的质押轻量表
export async function getStakeTable(addr) {
  const c = await getStaking(true);
  return await c.getStakeTableOf(addr);
}

// 我的认购表
export async function getSubscribeTable(addr) {
  const c = await getStaking(true);
  return await c.getSubscribeTableOf(addr);
}

// 读取“带 claimableNow 的”认购明细列表（首页领取弹窗）
export async function getAllMySubscriptions(addr) {
  const c = await getStaking(true);
  return await c.getAllMySubscriptions(addr);
}

// 单条仓位权威信息（需要传 user 地址 + posId）
export async function getPosition(userAddr, posId) {
  const c = await getStaking(true);
  return await c.getPosition(userAddr, BigInt(posId));
}

// sTUOK 名义余额（= 未赎回仓位的本息合计）
export async function stakingShareBalanceOf(addr, { human = true } = {}) {
  const c = await getStaking(true);
  const raw = await c.balanceOf(addr);
  return human ? Number(ethers.formatUnits(raw, 18)) : raw;
}

/** 报价（优先走合约内置） */
export async function quoteOutUsdtToSck(usdtAmount) {
  const c = await getStaking(true);
  const dec = await decimalsOf(USDT_ADDRESS);
  return await c.quoteSckOut(parseUnits(usdtAmount, dec));
}
export async function quoteOutSckToUsdt(sckAmount) {
  const [router, sckDec, usdtDec] = await Promise.all([
    getRouter(true),
    decimalsOf(SCK_ADDRESS),
    decimalsOf(USDT_ADDRESS),
  ]);
  const inWei = parseUnits(sckAmount, sckDec);
  const amounts = await router.getAmountsOut(inWei, PATH_SCK_TO_USDT);
  return amounts[amounts.length - 1];
}

/* ============ SCK 价格读取（LP + Router） ============ */
export async function getSckPriceInUSDT_ByReserves() {
  const [pair, sckDec, usdtDec] = await Promise.all([
    getSckUsdtPair(),
    decimalsOf(SCK_ADDRESS),
    decimalsOf(USDT_ADDRESS),
  ]);
  const [r0, r1] = await pair.getReserves();
  const t0 = await pair.token0();
  const t1 = await pair.token1();

  let reserveSck, reserveUsdt;
  if (t0.toLowerCase() === SCK_ADDRESS.toLowerCase()) {
    reserveSck = r0;
    reserveUsdt = r1;
  } else if (t1.toLowerCase() === SCK_ADDRESS.toLowerCase()) {
    reserveSck = r1;
    reserveUsdt = r0;
  } else {
    throw new Error("Pair 中未找到 SCK");
  }
  if (reserveSck === 0n || reserveUsdt === 0n) {
    throw new Error("LP 储备为 0，无法计算价格");
  }

  const sck = Number(ethers.formatUnits(reserveSck, sckDec));
  const usdt = Number(ethers.formatUnits(reserveUsdt, usdtDec));
  const price = usdt / sck; // 1 SCK ≈ ? USDT

  const pairAddress = await getSckUsdtPairAddress();
  return {
    price,
    sckDecimals: Number(sckDec),
    usdtDecimals: Number(usdtDec),
    reserves: { sck: reserveSck, usdt: reserveUsdt },
    pairAddress,
  };
}

export async function getSckPriceInUSDT_ByRouter(amountSck = "1") {
  const [router, sckDec, usdtDec] = await Promise.all([
    getRouter(true),
    decimalsOf(SCK_ADDRESS),
    decimalsOf(USDT_ADDRESS),
  ]);
  const inWei = parseUnits(amountSck, sckDec);
  const amounts = await router.getAmountsOut(inWei, PATH_SCK_TO_USDT);
  const outUsdtWei = amounts[amounts.length - 1];
  const price = Number(ethers.formatUnits(outUsdtWei, usdtDec)) / Number(amountSck);

  return {
    price,
    amountIn: inWei,
    amountOut: outUsdtWei,
    sckDecimals: Number(sckDec),
    usdtDecimals: Number(usdtDec),
  };
}

/* ============ 业务增强：VIP & 绑定关系 ============ */
export async function vipLevelOf(addr) {
  const c = await getStaking(true);
  const v = await c.vipLevelOf(addr); // { level, smallArea }
  return { level: Number(v.level ?? v[0] ?? 0), smallArea: v.smallArea ?? v[1] ?? 0n };
}

const TOPIC_BOUND = ethers.id("Bound(address,address)");

export async function fetchReferralsByLogs(me, fromBlock = 0, toBlock = "latest") {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const filter = {
    address: STAKING_ADDRESS,
    fromBlock,
    toBlock,
    topics: [TOPIC_BOUND, null, ethers.zeroPadValue(me, 32)],
  };
  const logs = await provider.getLogs(filter);

  const children = new Set();
  for (const lg of logs) {
    if (lg.topics?.length >= 3) {
      const user = ethers.getAddress("0x" + lg.topics[1].slice(26));
      children.add(user);
    }
  }
  return [...children].sort((a, b) => a.localeCompare(b));
}

/* ============ 管理员：基础设置 ============ */
export async function admin_setSCK(sckAddr) {
  await ensureChain();
  const signer = await getSigner();
  await assertOwner(await signer.getAddress());
  const c = await getStaking(false);
  const tx = await c.setSCK(sckAddr);
  return await tx.wait();
}

export async function admin_setMarketingAddress(addr) {
  await ensureChain();
  const signer = await getSigner();
  await assertOwner(await signer.getAddress());
  const c = await getStaking(false);
  const tx = await c.setMarketingAddress(addr);
  return await tx.wait();
}

export async function admin_setTreasury(addr) {
  await ensureChain();
  const signer = await getSigner();
  await assertOwner(await signer.getAddress());
  const c = await getStaking(false);
  const tx = await c.setTreasury(addr);
  return await tx.wait();
}

/* ============ 管理员：预售 / Mint 开关与参数 ============ */
export async function admin_setPresale(enabled) {
  await ensureChain();
  const signer = await getSigner();
  await assertOwner(await signer.getAddress());
  const c = await getStaking(false);
  const tx = await c.setPresale(!!enabled);
  return await tx.wait();
}

export async function admin_setPresalePrice(sckPerUsdt_1e18) {
  await ensureChain();
  const signer = await getSigner();
  await assertOwner(await signer.getAddress());
  const c = await getStaking(false);
  // 这里入参应为 1e18 精度的整数（字符串或 BigInt）
  const tx = await c.setPresalePrice(sckPerUsdt_1e18);
  return await tx.wait();
}

export async function admin_setPresaleUnit(newUnitWei) {
  await ensureChain();
  const signer = await getSigner();
  await assertOwner(await signer.getAddress());
  const c = await getStaking(false);
  // 这里入参为 USDT 的最小单位（18位）
  const tx = await c.setPresaleUnit(newUnitWei);
  return await tx.wait();
}

export async function admin_setMintingEnabled(enabled) {
  await ensureChain();
  const signer = await getSigner();
  await assertOwner(await signer.getAddress());
  const c = await getStaking(false);
  const tx = await c.setMintingEnabled(!!enabled);
  return await tx.wait();
}

/* ============ 管理员：VIP / 白名单 ============ */
export async function admin_setVipFloorAndOnlyUp(user, level, onlyUp) {
  await ensureChain();
  const signer = await getSigner();
  await assertOwner(await signer.getAddress());
  const c = await getStaking(false);
  const tx = await c.setVipFloorAndOnlyUp(user, level, !!onlyUp);
  return await tx.wait();
}

export async function admin_setWhitelist(addr, enabled) {
  await ensureChain();
  const signer = await getSigner();
  await assertOwner(await signer.getAddress());
  const c = await getStaking(false);
  const tx = await c.setWhitelist(addr, !!enabled);
  return await tx.wait();
}

export async function admin_isWhitelisted(addr) {
  const c = await getStaking(true);
  return await c.whitelist(addr);
}

/* ============ 管理员：每日额度轮次 ============ */
export async function admin_openDaily() {
  await ensureChain();
  // 该函数要求 caller 在 whitelist 中
  const c = await getStaking(false);
  const tx = await c.openDaily();
  return await tx.wait();
}

/* ============ 管理员：订单与空单 ============ */
export async function admin_processOrders(count) {
  await ensureChain();
  // 该函数要求 caller 在 whitelist 中
  const c = await getStaking(false);
  const tx = await c.processOrders(BigInt(count));
  return await tx.wait();
}

export async function admin_uploadOrder(user, amountUSDTWei) {
  await ensureChain();
  const signer = await getSigner();
  await assertOwner(await signer.getAddress());
  const c = await getStaking(false);
  // amountUSDTWei 为 18 位 USDT 最小单位
  const tx = await c.adminUploadOrder(user, amountUSDTWei);
  return await tx.wait();
}

/* ============ 管理员：资金救援 ============ */
export async function admin_rescueTokens(tokenAddr, amountWei) {
  await ensureChain();
  const signer = await getSigner();
  await assertOwner(await signer.getAddress());
  const c = await getStaking(false);
  const tx = await c.rescueTokens(tokenAddr, amountWei);
  return await tx.wait();
}

/* ============ 管理员：只读辅助 ============ */
export async function admin_getOrderHead() {
  const c = await getStaking(true);
  const [lastId, lastDone] = await Promise.all([
    c.lastOrderId(),
    c.lastProcessedOrderId(),
  ]);
  return { lastId, lastProcessed: lastDone };
}

export async function admin_getOrder(oid) {
  const c = await getStaking(true);
  const od = await c.orders(BigInt(oid));
  // 返回结构：{ otype, staker, amount, profit, ts, processed }
  return {
    otype: Number(od.otype ?? od[0] ?? 0),
    staker: od.staker ?? od[1],
    amount: od.amount ?? od[2],
    profit: od.profit ?? od[3],
    ts: od.ts ?? od[4],
    processed: od.processed ?? od[5],
  };
}

/* ============ 管理员：转让管理员 ============ */
export async function admin_transferOwnership(newOwner) {
  await ensureChain();
  const signer = await getSigner();
  await assertOwner(await signer.getAddress());     // 仅 owner 可发起
  const c = await getStaking(false);
  const tx = await c.transferOwnership(newOwner);   // 若合约是 Ownable2Step，这里会进入“待接受”状态
  return await tx.wait();
}
