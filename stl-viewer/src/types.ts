export type RenderMode = 'solid' | 'metal' | 'wireframe' | 'points';

export type MaterialColor = 'silver' | 'gold' | 'ruby' | 'emerald' | 'cyan' | 'slate' | 'coral';

export type LightingPreset = 'studio' | 'dramatic' | 'ambient';

export interface ModelStats {
  name: string;
  size: number; // in bytes
  triangles: number;
  width: number; // mm
  height: number; // mm
  depth: number; // mm
  volume: number; // mm^3
  surfaceArea: number; // mm^2
}

export interface DemoModel {
  id: string;
  name: string;
  description: string;
  type: 'torusKnot' | 'box' | 'cone' | 'customHeart';
  params?: any;
}

export const MATERIAL_COLORS: Record<MaterialColor, { name: string; hex: string; roughness: number; metalness: number; emissive?: string }> = {
  silver: { name: '太空銀 (Metallic Silver)', hex: '#d1d5db', roughness: 0.2, metalness: 0.9 },
  gold: { name: '流沙金 (Champagne Gold)', hex: '#fbbf24', roughness: 0.15, metalness: 1.0 },
  ruby: { name: '晶燦紅 (Polished Ruby)', hex: '#f43f5e', roughness: 0.1, metalness: 0.5 },
  emerald: { name: '翡翠綠 (Glossy Emerald)', hex: '#10b981', roughness: 0.2, metalness: 0.4 },
  cyan: { name: '雷射青 (Cyberpunk Cyan)', hex: '#06b6d4', roughness: 0.3, metalness: 0.8 },
  slate: { name: '極簡灰 (Industrial Slate)', hex: '#64748b', roughness: 0.6, metalness: 0.1 },
  coral: { name: '珊瑚橘 (Warm Coral)', hex: '#f97316', roughness: 0.4, metalness: 0.3 },
};

export const DEMO_MODELS: DemoModel[] = [
  {
    id: 'torus-knot',
    name: '工業扭轉螺旋環 (Torus Knot)',
    description: '一個帶有科技感、複雜的 3D 環扣螺旋結構，非常適合展示細緻的曲面與反光效果。',
    type: 'torusKnot',
    params: { radius: 10, tube: 3, tubularSegments: 120, radialSegments: 16, p: 2, q: 3 }
  },
  {
    id: 'tech-cube',
    name: '科技細分六面體 (Subdivided Cube)',
    description: '標準的 3D 列印測試方塊，邊角整齊，可用來觀測基準面和直角。',
    type: 'box',
    params: { width: 14, height: 14, depth: 14, segments: 10 }
  },
  {
    id: 'cone-pyramid',
    name: '漸變星芒三角錐 (Cone Star)',
    description: '具有鋒利邊緣的尖錐錐體，展示立體陰影與底端圓滑度。',
    type: 'cone',
    params: { radius: 10, height: 20, radialSegments: 5, heightSegments: 10 }
  },
  {
    id: 'heart-pendant',
    name: '幾何立體愛心 (Heart Pendant)',
    description: '使用數學公式繪製的愛心輪廓並拉伸（Extrude）出的 3D 愛心吊飾。',
    type: 'customHeart',
  }
];
