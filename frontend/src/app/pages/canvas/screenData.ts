export interface ScreenData {
  label: string;
  prompt: string;
  imageUrl: string;
}

export const SCREENS: ScreenData[] = [
  {
    label: "主视觉首屏",
    prompt:
      "超写实商业产品摄影，AirWave Pro 蓝牙耳机正面特写，专业摄影棚三点布光，纯白渐变背景，右侧橙色暖光侧打，4K 超高清细节，金属质感，立体阴影，白色底色反射，产品展示图风格",
    imageUrl:
      "https://images.unsplash.com/photo-1628329567705-f8f7150c3cff?w=800&q=85",
  },
  {
    label: "降噪卖点屏",
    prompt:
      "ANC 主动降噪技术信息图，声波消除可视化示意，蓝橙双色渐变，科技风线条，数据标注清晰，白色主背景，扁平化现代设计，降噪分贝数值图表，简洁专业风格",
    imageUrl:
      "https://images.unsplash.com/photo-1585298723682-7115561c51b7?w=800&q=85",
  },
  {
    label: "续航数据屏",
    prompt:
      "极简产品海报，超大「40H」白色数字居中，AirWave Pro 耳机侧面剪影，暖橙色渐变背景，电量图标，充电动效示意线稿，大留白设计，干净高端感",
    imageUrl:
      "https://images.unsplash.com/photo-1487215078519-e21cc028cb29?w=800&q=85",
  },
  {
    label: "生活场景收尾",
    prompt:
      "生活方式摄影，25岁职场女性佩戴 AirWave Pro 耳机，现代简约咖啡馆场景，自然柔和窗边光，人物侧面 45 度角，背景浅景深虚化，温暖真实生活氛围，情感共鸣风格",
    imageUrl:
      "https://images.unsplash.com/photo-1599669454699-248893623440?w=800&q=85",
  },
];
