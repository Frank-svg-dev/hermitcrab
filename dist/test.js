"use strict";
/**
 * 快速测试脚本 - 演示核心流程
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const Interceptor_1 = require("./core/Interceptor");
const TokenValidator_1 = require("./core/TokenValidator");
async function runTest() {
    console.log('🦞 LLM-ClawBands 核心流程测试\n');
    console.log('='.repeat(60));
    // 初始化
    const interceptor = new Interceptor_1.Interceptor();
    const tokenValidator = new TokenValidator_1.TokenValidator();
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
    const { AuditLog } = await Promise.resolve().then(() => __importStar(require('./memory/AuditLog')));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy90ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7R0FFRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILG9EQUFpRDtBQUNqRCwwREFBdUQ7QUFFdkQsS0FBSyxVQUFVLE9BQU87SUFDcEIsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0lBQ3pDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBRTVCLE1BQU07SUFDTixNQUFNLFdBQVcsR0FBRyxJQUFJLHlCQUFXLEVBQUUsQ0FBQztJQUN0QyxNQUFNLGNBQWMsR0FBRyxJQUFJLCtCQUFjLEVBQUUsQ0FBQztJQUU1QyxTQUFTO0lBQ1QsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0lBQ3hDLHdEQUF3RDtJQUV4RCx3QkFBd0I7SUFDeEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ25DLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FBQztJQUN4QyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUU1QixNQUFNLFdBQVcsR0FBRztRQUNsQixFQUFFLEVBQUUsUUFBUTtRQUNaLE1BQU0sRUFBRSxPQUFPO1FBQ2YsTUFBTSxFQUFFLE1BQU07UUFDZCxJQUFJLEVBQUUsQ0FBQyxhQUFhLENBQUM7UUFDckIsU0FBUyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUU7S0FDdEIsQ0FBQztJQUVGLE1BQU0sYUFBYSxHQUFHLE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUMvRCxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sYUFB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QUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQzNCLENBQUM7QUFFRCxPQUFPO0FBQ1AsT0FBTyxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICog5b+r6YCf5rWL6K+V6ISa5pysIC0g5ryU56S65qC45b+D5rWB56iLXG4gKi9cblxuaW1wb3J0IHsgSW50ZXJjZXB0b3IgfSBmcm9tICcuL2NvcmUvSW50ZXJjZXB0b3InO1xuaW1wb3J0IHsgVG9rZW5WYWxpZGF0b3IgfSBmcm9tICcuL2NvcmUvVG9rZW5WYWxpZGF0b3InO1xuXG5hc3luYyBmdW5jdGlvbiBydW5UZXN0KCkge1xuICBjb25zb2xlLmxvZygn8J+mniBMTE0tQ2xhd0JhbmRzIOaguOW/g+a1geeoi+a1i+ivlVxcbicpO1xuICBjb25zb2xlLmxvZygnPScucmVwZWF0KDYwKSk7XG5cbiAgLy8g5Yid5aeL5YyWXG4gIGNvbnN0IGludGVyY2VwdG9yID0gbmV3IEludGVyY2VwdG9yKCk7XG4gIGNvbnN0IHRva2VuVmFsaWRhdG9yID0gbmV3IFRva2VuVmFsaWRhdG9yKCk7XG5cbiAgLy8g5re75Yqg5rWL6K+V5Luk54mMXG4gIGNvbnNvbGUubG9nKCdcXG4x77iP4oOjIOa3u+WKoOa1i+ivleS7pOeJjDogTWVuZ3JhbjEyMycpO1xuICAvLyBhd2FpdCB0b2tlblZhbGlkYXRvci5hZGRUb2tlbignZnJhbmsnLCAnTWVuZ3JhbjEyMycpO1xuXG4gIC8vIOa1i+ivleWcuuaZryAxOiDkvY7po47pmanmk43kvZwgKGxzIOWRveS7pClcbiAgY29uc29sZS5sb2coJ1xcbicgKyAnPScucmVwZWF0KDYwKSk7XG4gIGNvbnNvbGUubG9nKCcy77iP4oOjIOa1i+ivleWcuuaZr++8muS9jumjjumZqeaTjeS9nCAoYmFzaCBscyknKTtcbiAgY29uc29sZS5sb2coJz0nLnJlcGVhdCg2MCkpO1xuICBcbiAgY29uc3QgbG93Umlza0NhbGwgPSB7XG4gICAgaWQ6ICd0ZXN0LTEnLFxuICAgIG1vZHVsZTogJ1NoZWxsJyxcbiAgICBtZXRob2Q6ICdiYXNoJyxcbiAgICBhcmdzOiBbJ2xzIC1sYSAvdG1wJ10sXG4gICAgdGltZXN0YW1wOiBEYXRlLm5vdygpLFxuICB9O1xuXG4gIGNvbnN0IGxvd1Jpc2tSZXN1bHQgPSBhd2FpdCBpbnRlcmNlcHRvci5pbnRlcmNlcHQobG93Umlza0NhbGwpO1xuICBjb25zb2xlLmxvZyhg57uT5p6c77yaJHtsb3dSaXNrUmVzdWx0LmJsb2NrID8gJ+KdjCDpmLvmraInIDogJ+KchSDlhYHorrgnfWApO1xuXG4gIC8vIOa1i+ivleWcuuaZryAyOiDpq5jpo47pmanmk43kvZwgKHJtIC1yZilcbiAgY29uc29sZS5sb2coJ1xcbicgKyAnPScucmVwZWF0KDYwKSk7XG4gIGNvbnNvbGUubG9nKCcz77iP4oOjIOa1i+ivleWcuuaZr++8mumrmOmjjumZqeaTjeS9nCAoYmFzaCBybSAtcmYpJyk7XG4gIGNvbnNvbGUubG9nKCc9Jy5yZXBlYXQoNjApKTtcblxuICBjb25zdCBoaWdoUmlza0NhbGwgPSB7XG4gICAgaWQ6ICd0ZXN0LTInLFxuICAgIG1vZHVsZTogJ1NoZWxsJyxcbiAgICBtZXRob2Q6ICdiYXNoJyxcbiAgICBhcmdzOiBbJ3JtIC1yZiAvdG1wL2NhY2hlJ10sXG4gICAgdGltZXN0YW1wOiBEYXRlLm5vdygpLFxuICB9O1xuXG4gIGNvbnN0IGhpZ2hSaXNrUmVzdWx0ID0gYXdhaXQgaW50ZXJjZXB0b3IuaW50ZXJjZXB0KGhpZ2hSaXNrQ2FsbCk7XG4gIGNvbnNvbGUubG9nKGDnu5PmnpzvvJoke2hpZ2hSaXNrUmVzdWx0LmJsb2NrID8gJ+KPuO+4jyDnrYnlvoXlrqHmibknIDogJ+KchSDlhYHorrgnfWApO1xuXG4gIGlmIChoaWdoUmlza1Jlc3VsdC5ibG9jayAmJiBoaWdoUmlza1Jlc3VsdC5yZXF1ZXN0SWQpIHtcbiAgICBjb25zb2xlLmxvZyhgXFxu8J+TiyDlvoXlrqHmibnor7fmsYIgSUQ6ICR7aGlnaFJpc2tSZXN1bHQucmVxdWVzdElkfWApO1xuXG4gICAgLy8g5qih5ouf55So5oi35Zue5aSNIC0g5Luk54mM6ZSZ6K+vXG4gICAgY29uc29sZS5sb2coJ1xcbicgKyAnPScucmVwZWF0KDYwKSk7XG4gICAgY29uc29sZS5sb2coJzTvuI/ig6Mg5rWL6K+V5Zy65pmv77ya5Luk54mM6ZSZ6K+vJyk7XG4gICAgY29uc29sZS5sb2coJz0nLnJlcGVhdCg2MCkpO1xuXG4gICAgY29uc3Qgd3JvbmdUb2tlblJlc3VsdCA9IGF3YWl0IGludGVyY2VwdG9yLnJlc3BvbmQoaGlnaFJpc2tSZXN1bHQucmVxdWVzdElkLCAnV3JvbmdUb2tlbiBZRVMnKTtcbiAgICBjb25zb2xlLmxvZyhg57uT5p6c77yaJHt3cm9uZ1Rva2VuUmVzdWx0LmFwcHJvdmVkID8gJ+KchSDmibnlh4YnIDogYOKdjCDmi5Lnu50gKCR7d3JvbmdUb2tlblJlc3VsdC5yZWFzb259KWB9YCk7XG5cbiAgICAvLyDph43mlrDlj5HotbflrqHmibkgKOWboOS4uuS4iuS4gOS4quiiq+aLkue7neS6hilcbiAgICBjb25zdCBoaWdoUmlza1Jlc3VsdDIgPSBhd2FpdCBpbnRlcmNlcHRvci5pbnRlcmNlcHQoaGlnaFJpc2tDYWxsKTtcbiAgICBcbiAgICBpZiAoaGlnaFJpc2tSZXN1bHQyLmJsb2NrICYmIGhpZ2hSaXNrUmVzdWx0Mi5yZXF1ZXN0SWQpIHtcbiAgICAgIC8vIOaooeaLn+eUqOaIt+WbnuWkjSAtIOS7pOeJjOato+ehrlxuICAgICAgY29uc29sZS5sb2coJ1xcbicgKyAnPScucmVwZWF0KDYwKSk7XG4gICAgICBjb25zb2xlLmxvZygnNe+4j+KDoyDmtYvor5XlnLrmma/vvJrku6TniYzmraPnoa4gKyDmibnlh4YnKTtcbiAgICAgIGNvbnNvbGUubG9nKCc9Jy5yZXBlYXQoNjApKTtcblxuICAgICAgY29uc3QgY29ycmVjdFRva2VuUmVzdWx0ID0gYXdhaXQgaW50ZXJjZXB0b3IucmVzcG9uZChoaWdoUmlza1Jlc3VsdDIucmVxdWVzdElkLCAnTWVuZ3JhbjEyMyBZRVMnKTtcbiAgICAgIGNvbnNvbGUubG9nKGDnu5PmnpzvvJoke2NvcnJlY3RUb2tlblJlc3VsdC5hcHByb3ZlZCA/ICfinIUg5om55YeGJyA6IGDinYwg5ouS57udICgke2NvcnJlY3RUb2tlblJlc3VsdC5yZWFzb259KWB9YCk7XG5cbiAgICAgIC8vIOa1i+ivleWcuuaZryAzOiDnm7jlkIzlkb3ku6TnrKzkuozmrKHmiafooYwgKOeUu+WDj+WMuemFjSlcbiAgICAgIGNvbnNvbGUubG9nKCdcXG4nICsgJz0nLnJlcGVhdCg2MCkpO1xuICAgICAgY29uc29sZS5sb2coJzbvuI/ig6Mg5rWL6K+V5Zy65pmv77ya55u45ZCM5ZG95Luk56ys5LqM5qyh5omn6KGMICjnlLvlg4/ljLnphY0pJyk7XG4gICAgICBjb25zb2xlLmxvZygnPScucmVwZWF0KDYwKSk7XG5cbiAgICAgIGNvbnN0IHByb2ZpbGVNYXRjaFJlc3VsdCA9IGF3YWl0IGludGVyY2VwdG9yLmludGVyY2VwdChoaWdoUmlza0NhbGwpO1xuICAgICAgY29uc29sZS5sb2coYOe7k+aenO+8miR7cHJvZmlsZU1hdGNoUmVzdWx0LmJsb2NrID8gJ+KPuO+4jyDnrYnlvoXlrqHmibknIDogJ+KchSDoh6rliqjlhYHorrggKOeUu+WDj+WMuemFjSknfWApO1xuICAgIH1cbiAgfVxuXG4gIC8vIOafpeeci+WuoeiuoeaXpeW/l1xuICBjb25zb2xlLmxvZygnXFxuJyArICc9Jy5yZXBlYXQoNjApKTtcbiAgY29uc29sZS5sb2coJ/Cfk4og5a6h6K6h5pel5b+X5pGY6KaBJyk7XG4gIGNvbnNvbGUubG9nKCc9Jy5yZXBlYXQoNjApKTtcbiAgXG4gIGNvbnN0IHsgQXVkaXRMb2cgfSA9IGF3YWl0IGltcG9ydCgnLi9tZW1vcnkvQXVkaXRMb2cnKTtcbiAgY29uc3QgYXVkaXRMb2cgPSBuZXcgQXVkaXRMb2coKTtcbiAgY29uc3QgbG9ncyA9IGF1ZGl0TG9nLnF1ZXJ5KDEwKTtcbiAgXG4gIGNvbnNvbGUubG9nKCdcXG7mnIDov5HlhrPnrZborrDlvZU6Jyk7XG4gIGZvciAoY29uc3QgbG9nIG9mIGxvZ3MpIHtcbiAgICBjb25zb2xlLmxvZyhgICAke2xvZy50aW1lc3RhbXB9IHwgJHtsb2cubW9kdWxlfS4ke2xvZy5tZXRob2R9IHwgJHtsb2cuZGVjaXNpb259IHwgJHtsb2cuc291cmNlfWApO1xuICB9XG5cbiAgY29uc29sZS5sb2coJ1xcbicgKyAnPScucmVwZWF0KDYwKSk7XG4gIGNvbnNvbGUubG9nKCfinIUg5rWL6K+V5a6M5oiQIVxcbicpO1xufVxuXG4vLyDov5DooYzmtYvor5VcbnJ1blRlc3QoKS5jYXRjaChjb25zb2xlLmVycm9yKTtcbiJdfQ==