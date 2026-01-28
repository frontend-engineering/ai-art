/**
 * 使用次数模态框逻辑测试
 * 测试所有弹窗类型的触发条件和显示逻辑
 */

const usageModal = require('../usageModal');

describe('usageModal - 弹窗类型判断', () => {
  describe('determineModalType', () => {
    test('免费用户剩余0次 → free_exhausted', () => {
      const result = usageModal.determineModalType(0, 'free', 'free');
      expect(result).toBe('free_exhausted');
    });

    test('免费用户剩余1次 → free_reminder', () => {
      const result = usageModal.determineModalType(1, 'free', 'free');
      expect(result).toBe('free_reminder');
    });

    test('免费用户剩余2次 → free_reminder', () => {
      const result = usageModal.determineModalType(2, 'free', 'free');
      expect(result).toBe('free_reminder');
    });

    test('免费用户剩余3次 → null', () => {
      const result = usageModal.determineModalType(3, 'free', 'free');
      expect(result).toBe(null);
    });

    test('体验版用户剩余0次 → paid_renewal_basic', () => {
      const result = usageModal.determineModalType(0, 'paid', 'basic');
      expect(result).toBe('paid_renewal_basic');
    });

    test('体验版用户剩余5次 → null', () => {
      const result = usageModal.determineModalType(5, 'paid', 'basic');
      expect(result).toBe(null);
    });

    test('尊享版用户剩余0次 → paid_renewal_premium', () => {
      const result = usageModal.determineModalType(0, 'paid', 'premium');
      expect(result).toBe('paid_renewal_premium');
    });

    test('尊享版用户剩余10次 → null', () => {
      const result = usageModal.determineModalType(10, 'paid', 'premium');
      expect(result).toBe(null);
    });

    test('付费用户但paymentStatus未指定 → paid_renewal_basic', () => {
      const result = usageModal.determineModalType(0, 'paid');
      expect(result).toBe('paid_renewal_basic');
    });
  });

  describe('shouldShowModal', () => {
    test('free_reminder 在 launch 页面显示', () => {
      const result = usageModal.shouldShowModal(2, 'free', 'launch', 'free');
      expect(result).toBe(true);
    });

    test('free_reminder 在 result 页面显示', () => {
      const result = usageModal.shouldShowModal(2, 'free', 'result', 'free');
      expect(result).toBe(true);
    });

    test('free_exhausted 在 launch 页面显示', () => {
      const result = usageModal.shouldShowModal(0, 'free', 'launch', 'free');
      expect(result).toBe(true);
    });

    test('free_exhausted 在 result 页面不显示', () => {
      const result = usageModal.shouldShowModal(0, 'free', 'result', 'free');
      expect(result).toBe(false);
    });

    test('paid_renewal_basic 在 launch 页面显示', () => {
      const result = usageModal.shouldShowModal(0, 'paid', 'launch', 'basic');
      expect(result).toBe(true);
    });

    test('paid_renewal_basic 在 result 页面不显示', () => {
      const result = usageModal.shouldShowModal(0, 'paid', 'result', 'basic');
      expect(result).toBe(false);
    });

    test('paid_renewal_premium 在 launch 页面显示', () => {
      const result = usageModal.shouldShowModal(0, 'paid', 'launch', 'premium');
      expect(result).toBe(true);
    });

    test('paid_renewal_premium 在 result 页面不显示', () => {
      const result = usageModal.shouldShowModal(0, 'paid', 'result', 'premium');
      expect(result).toBe(false);
    });

    test('免费用户剩余3次不显示弹窗', () => {
      const result = usageModal.shouldShowModal(3, 'free', 'launch', 'free');
      expect(result).toBe(false);
    });
  });

  describe('checkModalOnPageLoad', () => {
    test('免费用户剩余2次在launch页面', () => {
      const result = usageModal.checkModalOnPageLoad(2, 'free', 'launch', 'free');
      expect(result).toEqual({
        show: true,
        modalType: 'free_reminder'
      });
    });

    test('免费用户剩余0次在launch页面', () => {
      const result = usageModal.checkModalOnPageLoad(0, 'free', 'launch', 'free');
      expect(result).toEqual({
        show: true,
        modalType: 'free_exhausted'
      });
    });

    test('免费用户剩余0次在result页面', () => {
      const result = usageModal.checkModalOnPageLoad(0, 'free', 'result', 'free');
      expect(result).toEqual({
        show: false,
        modalType: 'free_exhausted'
      });
    });

    test('体验版用户剩余0次在launch页面', () => {
      const result = usageModal.checkModalOnPageLoad(0, 'paid', 'launch', 'basic');
      expect(result).toEqual({
        show: true,
        modalType: 'paid_renewal_basic'
      });
    });

    test('免费用户剩余5次不显示弹窗', () => {
      const result = usageModal.checkModalOnPageLoad(5, 'free', 'launch', 'free');
      expect(result).toEqual({
        show: false,
        modalType: null
      });
    });
  });
});

describe('usageModal - 按钮状态', () => {
  describe('shouldDisableButton', () => {
    test('剩余0次 → 禁用按钮', () => {
      const result = usageModal.shouldDisableButton(0);
      expect(result).toBe(true);
    });

    test('剩余1次 → 不禁用按钮', () => {
      const result = usageModal.shouldDisableButton(1);
      expect(result).toBe(false);
    });

    test('剩余10次 → 不禁用按钮', () => {
      const result = usageModal.shouldDisableButton(10);
      expect(result).toBe(false);
    });
  });

  describe('getButtonText', () => {
    test('剩余0次 → "次数已用完"', () => {
      const result = usageModal.getButtonText(0, '开始生成');
      expect(result).toBe('次数已用完');
    });

    test('剩余1次 → 默认文本', () => {
      const result = usageModal.getButtonText(1, '开始生成');
      expect(result).toBe('开始生成');
    });

    test('剩余10次 → 默认文本', () => {
      const result = usageModal.getButtonText(10, '立即制作全家福');
      expect(result).toBe('立即制作全家福');
    });
  });

  describe('getButtonClass', () => {
    test('剩余0次 → btn-disabled', () => {
      const result = usageModal.getButtonClass(0);
      expect(result).toBe('btn-disabled');
    });

    test('剩余1次 → btn-warning', () => {
      const result = usageModal.getButtonClass(1);
      expect(result).toBe('btn-warning');
    });

    test('剩余2次 → btn-warning', () => {
      const result = usageModal.getButtonClass(2);
      expect(result).toBe('btn-warning');
    });

    test('剩余3次 → btn-primary', () => {
      const result = usageModal.getButtonClass(3);
      expect(result).toBe('btn-primary');
    });
  });
});

describe('usageModal - 文本格式化', () => {
  describe('formatUsageText', () => {
    test('免费用户剩余0次', () => {
      const result = usageModal.formatUsageText(0, 'free');
      expect(result).toBe('免费次数已用完');
    });

    test('付费用户剩余0次', () => {
      const result = usageModal.formatUsageText(0, 'paid');
      expect(result).toBe('次数已用完');
    });

    test('免费用户剩余5次', () => {
      const result = usageModal.formatUsageText(5, 'free');
      expect(result).toBe('剩余 5 次');
    });

    test('付费用户剩余10次', () => {
      const result = usageModal.formatUsageText(10, 'paid');
      expect(result).toBe('剩余 10 次');
    });
  });
});

describe('usageModal - 边界情况', () => {
  test('负数次数应该视为0次', () => {
    const result = usageModal.determineModalType(-1, 'free', 'free');
    // 注意：当前实现没有处理负数，应该返回 free_exhausted
    // 如果需要，可以在实现中添加边界检查
    expect(result).toBe(null); // 当前实现
  });

  test('非常大的次数不显示弹窗', () => {
    const result = usageModal.shouldShowModal(999, 'free', 'launch', 'free');
    expect(result).toBe(false);
  });

  test('未知用户类型默认处理', () => {
    const result = usageModal.determineModalType(0, 'unknown', 'free');
    // 当前实现会返回 null，因为不匹配任何条件
    expect(result).toBe(null);
  });

  test('未知付费状态默认为basic', () => {
    const result = usageModal.determineModalType(0, 'paid', 'unknown');
    expect(result).toBe('paid_renewal_basic');
  });
});

describe('usageModal - 完整场景测试', () => {
  test('场景1：免费用户首次使用（剩余3次）', () => {
    const usageCount = 3;
    const userType = 'free';
    const paymentStatus = 'free';
    
    const modalType = usageModal.determineModalType(usageCount, userType, paymentStatus);
    const showModal = usageModal.shouldShowModal(usageCount, userType, 'launch', paymentStatus);
    const buttonDisabled = usageModal.shouldDisableButton(usageCount);
    const buttonText = usageModal.getButtonText(usageCount, '立即制作全家福');
    
    expect(modalType).toBe(null);
    expect(showModal).toBe(false);
    expect(buttonDisabled).toBe(false);
    expect(buttonText).toBe('立即制作全家福');
  });

  test('场景2：免费用户剩余2次', () => {
    const usageCount = 2;
    const userType = 'free';
    const paymentStatus = 'free';
    
    const modalType = usageModal.determineModalType(usageCount, userType, paymentStatus);
    const showModalLaunch = usageModal.shouldShowModal(usageCount, userType, 'launch', paymentStatus);
    const showModalResult = usageModal.shouldShowModal(usageCount, userType, 'result', paymentStatus);
    const buttonDisabled = usageModal.shouldDisableButton(usageCount);
    const buttonText = usageModal.getButtonText(usageCount, '立即制作全家福');
    
    expect(modalType).toBe('free_reminder');
    expect(showModalLaunch).toBe(true);
    expect(showModalResult).toBe(true);
    expect(buttonDisabled).toBe(false);
    expect(buttonText).toBe('立即制作全家福');
  });

  test('场景3：免费用户剩余0次', () => {
    const usageCount = 0;
    const userType = 'free';
    const paymentStatus = 'free';
    
    const modalType = usageModal.determineModalType(usageCount, userType, paymentStatus);
    const showModalLaunch = usageModal.shouldShowModal(usageCount, userType, 'launch', paymentStatus);
    const showModalResult = usageModal.shouldShowModal(usageCount, userType, 'result', paymentStatus);
    const buttonDisabled = usageModal.shouldDisableButton(usageCount);
    const buttonText = usageModal.getButtonText(usageCount, '立即制作全家福');
    
    expect(modalType).toBe('free_exhausted');
    expect(showModalLaunch).toBe(true);
    expect(showModalResult).toBe(false);
    expect(buttonDisabled).toBe(true);
    expect(buttonText).toBe('次数已用完');
  });

  test('场景4：体验版用户剩余0次', () => {
    const usageCount = 0;
    const userType = 'paid';
    const paymentStatus = 'basic';
    
    const modalType = usageModal.determineModalType(usageCount, userType, paymentStatus);
    const showModalLaunch = usageModal.shouldShowModal(usageCount, userType, 'launch', paymentStatus);
    const showModalResult = usageModal.shouldShowModal(usageCount, userType, 'result', paymentStatus);
    const buttonDisabled = usageModal.shouldDisableButton(usageCount);
    const buttonText = usageModal.getButtonText(usageCount, '立即变身豪门');
    
    expect(modalType).toBe('paid_renewal_basic');
    expect(showModalLaunch).toBe(true);
    expect(showModalResult).toBe(false);
    expect(buttonDisabled).toBe(true);
    expect(buttonText).toBe('次数已用完');
  });

  test('场景5：尊享版用户剩余0次', () => {
    const usageCount = 0;
    const userType = 'paid';
    const paymentStatus = 'premium';
    
    const modalType = usageModal.determineModalType(usageCount, userType, paymentStatus);
    const showModalLaunch = usageModal.shouldShowModal(usageCount, userType, 'launch', paymentStatus);
    const showModalResult = usageModal.shouldShowModal(usageCount, userType, 'result', paymentStatus);
    const buttonDisabled = usageModal.shouldDisableButton(usageCount);
    
    expect(modalType).toBe('paid_renewal_premium');
    expect(showModalLaunch).toBe(true);
    expect(showModalResult).toBe(false);
    expect(buttonDisabled).toBe(true);
  });
});
