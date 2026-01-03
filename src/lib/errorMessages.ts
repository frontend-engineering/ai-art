/**
 * 友好的错误提示工具
 * 将技术性错误转换为通俗易懂的提示，配emoji和解决方案
 */

export interface FriendlyError {
  emoji: string;
  title: string;
  message: string;
  solution: string;
  retryable?: boolean; // 是否可以重试
  actionText?: string; // 操作按钮文字
}

/**
 * 错误类型映射
 */
const ERROR_PATTERNS: Array<{
  pattern: RegExp | string;
  error: FriendlyError;
}> = [
  // 人脸检测相关
  {
    pattern: /face.*not.*found|no.*face.*detected|未检测到人脸/i,
    error: {
      emoji: '😊',
      title: '照片里人脸太小啦',
      message: '我们没有找到清晰的人脸',
      solution: '选一张正面大头像吧，光线越亮效果越好！',
      retryable: true,
      actionText: '重新上传'
    }
  },
  {
    pattern: /face.*blur|模糊|不清晰/i,
    error: {
      emoji: '📸',
      title: '照片有点模糊哦',
      message: '人脸不够清晰',
      solution: '重新拍一张清晰的照片，或者选择其他照片试试',
      retryable: true,
      actionText: '重新上传'
    }
  },
  {
    pattern: /face.*small|人脸.*小/i,
    error: {
      emoji: '🔍',
      title: '人脸太小了',
      message: '照片中的人脸尺寸太小',
      solution: '拍摄时靠近一点，让人脸占据照片的主要位置',
      retryable: true,
      actionText: '重新上传'
    }
  },
  {
    pattern: /multiple.*faces|多个.*人脸/i,
    error: {
      emoji: '👥',
      title: '照片里人太多啦',
      message: '检测到多个人脸',
      solution: '每张照片只放一个人，这样效果更好哦',
      retryable: true,
      actionText: '重新上传'
    }
  },
  
  // 图片上传相关
  {
    pattern: /file.*too.*large|文件.*太大|超过.*大小/i,
    error: {
      emoji: '📦',
      title: '照片太大啦',
      message: '照片文件超过了10MB',
      solution: '压缩一下照片，或者选择其他照片试试',
      retryable: true,
      actionText: '重新选择'
    }
  },
  {
    pattern: /invalid.*format|格式.*不支持|unsupported.*format/i,
    error: {
      emoji: '🖼️',
      title: '照片格式不对',
      message: '只支持JPG、PNG格式的照片',
      solution: '换一张JPG或PNG格式的照片试试',
      retryable: true,
      actionText: '重新选择'
    }
  },
  {
    pattern: /upload.*failed|上传.*失败/i,
    error: {
      emoji: '📤',
      title: '上传失败了',
      message: '照片上传遇到了问题',
      solution: '检查一下网络连接，然后重试一次',
      retryable: true,
      actionText: '重试'
    }
  },
  {
    pattern: /image.*corrupt|图片.*损坏/i,
    error: {
      emoji: '🔨',
      title: '照片打不开',
      message: '照片文件可能已损坏',
      solution: '换一张照片试试，或者重新拍一张',
      retryable: true,
      actionText: '重新选择'
    }
  },
  
  // 生成相关
  {
    pattern: /generation.*failed|生成.*失败/i,
    error: {
      emoji: '🎨',
      title: '生成失败了',
      message: 'AI生成遇到了问题',
      solution: '稍等一会儿再试，或者换张照片试试',
      retryable: true,
      actionText: '重试'
    }
  },
  {
    pattern: /timeout|超时/i,
    error: {
      emoji: '⏰',
      title: '等待时间太长了',
      message: '生成超时了',
      solution: '现在人有点多，稍等一会儿再试试',
      retryable: true,
      actionText: '重试'
    }
  },
  {
    pattern: /queue.*full|队列.*满/i,
    error: {
      emoji: '🚦',
      title: '现在人太多啦',
      message: '生成队列已满',
      solution: '稍等几分钟，等人少一点再试',
      retryable: true,
      actionText: '稍后重试'
    }
  },
  {
    pattern: /content.*violation|内容.*违规|审核.*不通过/i,
    error: {
      emoji: '🚫',
      title: '内容不符合规范',
      message: '照片内容未通过审核',
      solution: '换一张符合规范的照片试试',
      retryable: true,
      actionText: '重新上传'
    }
  },
  {
    pattern: /task.*not.*found|任务.*不存在/i,
    error: {
      emoji: '🔍',
      title: '找不到生成任务',
      message: '生成任务可能已过期',
      solution: '重新开始生成流程',
      retryable: true,
      actionText: '重新生成'
    }
  },
  
  // 支付相关
  {
    pattern: /payment.*failed|支付.*失败/i,
    error: {
      emoji: '💳',
      title: '支付没成功',
      message: '支付遇到了问题',
      solution: '检查一下支付方式，然后重试一次',
      retryable: true,
      actionText: '重新支付'
    }
  },
  {
    pattern: /insufficient.*balance|余额.*不足/i,
    error: {
      emoji: '💰',
      title: '余额不够了',
      message: '账户余额不足',
      solution: '充值后再试，或者换个支付方式',
      retryable: true,
      actionText: '更换支付方式'
    }
  },
  {
    pattern: /payment.*cancelled|支付.*取消/i,
    error: {
      emoji: '❌',
      title: '支付已取消',
      message: '您取消了支付',
      solution: '如需继续，请重新发起支付',
      retryable: true,
      actionText: '重新支付'
    }
  },
  {
    pattern: /order.*not.*found|订单.*不存在/i,
    error: {
      emoji: '📋',
      title: '找不到订单',
      message: '订单信息不存在或已过期',
      solution: '重新创建订单',
      retryable: true,
      actionText: '重新下单'
    }
  },
  
  // 网络相关
  {
    pattern: /network.*error|网络.*错误|connection.*failed|ERR_NETWORK/i,
    error: {
      emoji: '📡',
      title: '网络不太好',
      message: '网络连接出现问题',
      solution: '检查一下网络连接，然后重试',
      retryable: true,
      actionText: '重试'
    }
  },
  {
    pattern: /server.*error|服务器.*错误|500|502|503|504/i,
    error: {
      emoji: '🔧',
      title: '服务器开小差了',
      message: '服务器遇到了问题',
      solution: '稍等一会儿再试，我们正在修复',
      retryable: true,
      actionText: '稍后重试'
    }
  },
  {
    pattern: /404|not.*found/i,
    error: {
      emoji: '🔍',
      title: '找不到资源',
      message: '请求的资源不存在',
      solution: '刷新页面重试，或联系客服',
      retryable: true,
      actionText: '刷新页面'
    }
  },
  {
    pattern: /CORS|跨域/i,
    error: {
      emoji: '🔒',
      title: '访问受限',
      message: '资源访问受到限制',
      solution: '请联系客服解决',
      retryable: false,
      actionText: '联系客服'
    }
  },
  
  // 参数相关
  {
    pattern: /invalid.*parameter|参数.*错误|missing.*parameter|参数.*缺失/i,
    error: {
      emoji: '📝',
      title: '信息填写不完整',
      message: '有些必填信息没有填写',
      solution: '检查一下是否所有信息都填写完整了',
      retryable: true,
      actionText: '重新填写'
    }
  },
  {
    pattern: /validation.*failed|校验.*失败/i,
    error: {
      emoji: '✏️',
      title: '信息格式不对',
      message: '填写的信息格式不正确',
      solution: '按照提示格式重新填写',
      retryable: true,
      actionText: '重新填写'
    }
  },
  
  // 权限相关
  {
    pattern: /permission.*denied|权限.*不足|unauthorized|401|403/i,
    error: {
      emoji: '🔒',
      title: '没有权限哦',
      message: '您没有权限进行此操作',
      solution: '升级套餐或联系客服获取权限',
      retryable: false,
      actionText: '升级套餐'
    }
  },
  {
    pattern: /quota.*exceeded|次数.*用完|limit.*reached/i,
    error: {
      emoji: '🎫',
      title: '次数用完了',
      message: '您的使用次数已达上限',
      solution: '升级套餐获取更多次数，或者明天再来',
      retryable: false,
      actionText: '升级套餐'
    }
  },
  {
    pattern: /session.*expired|会话.*过期|登录.*过期/i,
    error: {
      emoji: '⏱️',
      title: '登录过期了',
      message: '您的登录已过期',
      solution: '重新登录后继续',
      retryable: true,
      actionText: '重新登录'
    }
  },
  
  // 数据相关
  {
    pattern: /data.*not.*found|数据.*不存在/i,
    error: {
      emoji: '📂',
      title: '找不到数据',
      message: '请求的数据不存在',
      solution: '刷新页面重试',
      retryable: true,
      actionText: '刷新'
    }
  },
  {
    pattern: /database.*error|数据库.*错误/i,
    error: {
      emoji: '💾',
      title: '数据保存失败',
      message: '数据库遇到了问题',
      solution: '稍后重试，或联系客服',
      retryable: true,
      actionText: '重试'
    }
  }
];

/**
 * 将技术性错误转换为友好提示
 */
export function getFriendlyError(error: string | Error): FriendlyError {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  // 遍历错误模式，找到匹配的
  for (const { pattern, error: friendlyError } of ERROR_PATTERNS) {
    if (typeof pattern === 'string') {
      if (errorMessage.includes(pattern)) {
        return friendlyError;
      }
    } else {
      if (pattern.test(errorMessage)) {
        return friendlyError;
      }
    }
  }
  
  // 默认错误提示
  return {
    emoji: '😕',
    title: '出了点小问题',
    message: '操作遇到了问题',
    solution: '稍等一会儿再试，或者联系客服帮忙',
    retryable: true,
    actionText: '重试'
  };
}

/**
 * 格式化友好错误为显示文本
 */
export function formatFriendlyError(error: FriendlyError): string {
  return `${error.emoji} ${error.title}\n${error.message}\n💡 ${error.solution}`;
}

/**
 * 直接从错误获取友好提示文本
 */
export function getFriendlyErrorMessage(error: string | Error): string {
  const friendlyError = getFriendlyError(error);
  return formatFriendlyError(friendlyError);
}
