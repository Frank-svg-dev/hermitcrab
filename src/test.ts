/**
 * 快速测试脚本 - 演示核心流程
 */

import { Interceptor } from './core/Interceptor';
import { TokenValidator } from './core/TokenValidator';

async function runTest() {
  console.log('🦞 LLM-ClawBands 核心流程测试\n');
  console.log('='.repeat(60));

  // 初始化
  const interceptor = new Interceptor();
  const tokenValidator = new TokenValidator();

  // 添加测试令牌
  console.log('\n1️⃣ 添加测试令牌: Mengran123');
  // await tokenValidator.addToken('frank', 'Mengran123');

  // 测试场景 1: 低风险操作 (ls 命令)
  console.log('\n' + '='.repeat(60));
  console.log('2️⃣ 测试场景：低风险操作 (bash ls)');
  console.log('='.repeat(60));
  
  const lowRiskCall = {
    id: 'test-1',
    module: 'Shell',
    method: 'bash',
    args: ['ls -la /tmp'],
    timestamp: Date.now(),
  };

  const lowRiskResult = await interceptor.intercept(lowRiskCall);
  console.log(`结果：${lowRiskResult.block ? '❌ 阻止' : '✅ 允许'}`);

  // 测试场景 2: 高风险操作 (rm -rf)
  console.log('\n' + '='.repeat(60));
  console.log('3️⃣ 测试场景：高风险操作 (bash rm -rf)');
  console.log('='.repeat(60));

  const highRiskCall = {
    id: 'test-2',
    module: 'Shell',
    method: 'bash',
    args: ['rm -rf /tmp/cache'],
    timestamp: Date.now(),
  };

  const highRiskResult = await interceptor.intercept(highRiskCall);
  console.log(`结果：${highRiskResult.block ? '⏸️ 等待审批' : '✅ 允许'}`);

  if (highRiskResult.block && highRiskResult.requestId) {
    console.log(`\n📋 待审批请求 ID: ${highRiskResult.requestId}`);

    // 模拟用户回复 - 令牌错误
    console.log('\n' + '='.repeat(60));
    console.log('4️⃣ 测试场景：令牌错误');
    console.log('='.repeat(60));

    const wrongTokenResult = await interceptor.respond(highRiskResult.requestId, 'WrongToken YES');
    console.log(`结果：${wrongTokenResult.approved ? '✅ 批准' : `❌ 拒绝 (${wrongTokenResult.reason})`}`);

    // 重新发起审批 (因为上一个被拒绝了)
    const highRiskResult2 = await interceptor.intercept(highRiskCall);
    
    if (highRiskResult2.block && highRiskResult2.requestId) {
      // 模拟用户回复 - 令牌正确
      console.log('\n' + '='.repeat(60));
      console.log('5️⃣ 测试场景：令牌正确 + 批准');
      console.log('='.repeat(60));

      const correctTokenResult = await interceptor.respond(highRiskResult2.requestId, 'Mengran123 YES');
      console.log(`结果：${correctTokenResult.approved ? '✅ 批准' : `❌ 拒绝 (${correctTokenResult.reason})`}`);

      // 测试场景 3: 相同命令第二次执行 (画像匹配)
      console.log('\n' + '='.repeat(60));
      console.log('6️⃣ 测试场景：相同命令第二次执行 (画像匹配)');
      console.log('='.repeat(60));

      const profileMatchResult = await interceptor.intercept(highRiskCall);
      console.log(`结果：${profileMatchResult.block ? '⏸️ 等待审批' : '✅ 自动允许 (画像匹配)'}`);
    }
  }

  // 查看审计日志
  console.log('\n' + '='.repeat(60));
  console.log('📊 审计日志摘要');
  console.log('='.repeat(60));
  
  const { AuditLog } = await import('./memory/AuditLog');
  const auditLog = new AuditLog();
  const logs = auditLog.query(10);
  
  console.log('\n最近决策记录:');
  for (const log of logs) {
    console.log(`  ${log.timestamp} | ${log.module}.${log.method} | ${log.decision} | ${log.source}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ 测试完成!\n');
}

// 运行测试
runTest().catch(console.error);
