'use strict';
const vm = require('vm');

async function runScript(code, variableContext, contextEnv) {
  // 外部包裹一个自执行函数
  const wrappedCode = `
    (async function () {
      ${code}
    })();
  `;
  // 创建一个 vm.Script 实例, 编译要执行的代码
  const script = new vm.Script(wrappedCode);
  // 创建沙箱环境
  const sandbox = {
    require,
    console,
    process,
    setTimeout,
    setInterval,
    Promise,
    contextEnv: contextEnv
      ? {
        Source: contextEnv.WEDA_SOURCE,
        Uid: contextEnv.WEDA_UUID,
        RequestId: contextEnv['X-Request-Id'],
      }
      : {},
    ...variableContext,
  };
  // 创建一个 context, 绑定沙箱环境，作为全局对象
  const context = vm.createContext(sandbox);
  // 运行上面编译的代码
  const result = await script.runInNewContext(context, { timeout: 30000 });

  return result;
}

exports.main = async (event, context) => {
  const result = await runScript(
    event.code,
    event.variableContext,
    JSON.parse(context.environment || '{}'),
  );
  return result;
};

