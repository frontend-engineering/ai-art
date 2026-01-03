import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * 人脸位置信息接口
 */
export interface FacePosition {
  id: string;
  imageBase64: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  sourceImage: string;
}

/**
 * CanvasPositioning组件Props
 */
interface CanvasPositioningProps {
  backgroundUrl: string;
  faceImages: Array<{
    imageBase64: string;
    bbox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    sourceImage: string;
  }>;
  onComplete: (positions: Array<{
    x: number;
    y: number;
    scale: number;
    rotation: number;
  }>) => void;
  onCancel: () => void;
}

/**
 * 画布定位组件
 * 允许用户拖拽、缩放、旋转人脸位置
 */
export default function CanvasPositioning({
  backgroundUrl,
  faceImages,
  onComplete,
  onCancel,
}: CanvasPositioningProps) {
  const [faces, setFaces] = useState<FacePosition[]>([]);
  const [selectedFaceId, setSelectedFaceId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showAlignmentLines, setShowAlignmentLines] = useState(true);
  const [alignmentLines, setAlignmentLines] = useState<{
    vertical: number[];
    horizontal: number[];
  }>({ vertical: [], horizontal: [] });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const backgroundImageRef = useRef<HTMLImageElement>(null);
  
  // 吸附阈值(像素)
  const SNAP_THRESHOLD = 10;

  // 初始化人脸位置
  useEffect(() => {
    const initialFaces: FacePosition[] = faceImages.map((face, index) => ({
      id: `face-${index}`,
      imageBase64: face.imageBase64,
      x: 100 + index * 120, // 初始位置错开
      y: 100 + index * 50,
      scale: 1.0,
      rotation: 0,
      bbox: face.bbox,
      sourceImage: face.sourceImage,
    }));
    setFaces(initialFaces);
    
    // 默认选中第一个人脸
    if (initialFaces.length > 0) {
      setSelectedFaceId(initialFaces[0].id);
    }
  }, [faceImages]);

  // 处理人脸拖拽开始
  const handleDragStart = (faceId: string, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setSelectedFaceId(faceId);
    setIsDragging(true);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setDragStart({ x: clientX, y: clientY });
  };

  // 处理人脸拖拽
  const handleDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !selectedFaceId) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const deltaX = clientX - dragStart.x;
    const deltaY = clientY - dragStart.y;
    
    setFaces(prevFaces => {
      const updatedFaces = prevFaces.map(face => {
        if (face.id === selectedFaceId) {
          let newX = face.x + deltaX;
          let newY = face.y + deltaY;
          
          // 计算对齐线和吸附
          if (showAlignmentLines) {
            const alignLines = calculateAlignmentLines(
              { x: newX, y: newY },
              prevFaces.filter(f => f.id !== selectedFaceId)
            );
            setAlignmentLines(alignLines);
            
            // 吸附到对齐线
            const snapped = snapToAlignmentLines(
              { x: newX, y: newY },
              alignLines
            );
            newX = snapped.x;
            newY = snapped.y;
          }
          
          return { ...face, x: newX, y: newY };
        }
        return face;
      });
      
      return updatedFaces;
    });
    
    setDragStart({ x: clientX, y: clientY });
  };

  // 处理人脸拖拽结束
  const handleDragEnd = () => {
    setIsDragging(false);
    setAlignmentLines({ vertical: [], horizontal: [] });
  };

  // 计算对齐线
  const calculateAlignmentLines = (
    currentPos: { x: number; y: number },
    otherFaces: FacePosition[]
  ) => {
    const vertical: number[] = [];
    const horizontal: number[] = [];
    
    // 与其他人脸对齐
    otherFaces.forEach(face => {
      // 垂直对齐(左边、中心、右边)
      if (Math.abs(currentPos.x - face.x) < SNAP_THRESHOLD) {
        vertical.push(face.x);
      }
      if (Math.abs(currentPos.x - (face.x + 48)) < SNAP_THRESHOLD) {
        vertical.push(face.x + 48);
      }
      
      // 水平对齐(上边、中心、下边)
      if (Math.abs(currentPos.y - face.y) < SNAP_THRESHOLD) {
        horizontal.push(face.y);
      }
      if (Math.abs(currentPos.y - (face.y + 48)) < SNAP_THRESHOLD) {
        horizontal.push(face.y + 48);
      }
    });
    
    // 与画布中心对齐
    if (backgroundImageRef.current) {
      const centerX = backgroundImageRef.current.width / 2;
      const centerY = backgroundImageRef.current.height / 2;
      
      if (Math.abs(currentPos.x - centerX) < SNAP_THRESHOLD) {
        vertical.push(centerX);
      }
      if (Math.abs(currentPos.y - centerY) < SNAP_THRESHOLD) {
        horizontal.push(centerY);
      }
    }
    
    return { vertical, horizontal };
  };

  // 吸附到对齐线
  const snapToAlignmentLines = (
    pos: { x: number; y: number },
    lines: { vertical: number[]; horizontal: number[] }
  ) => {
    let newX = pos.x;
    let newY = pos.y;
    
    // 吸附到最近的垂直线
    if (lines.vertical.length > 0) {
      const closestVertical = lines.vertical.reduce((prev, curr) =>
        Math.abs(curr - pos.x) < Math.abs(prev - pos.x) ? curr : prev
      );
      if (Math.abs(closestVertical - pos.x) < SNAP_THRESHOLD) {
        newX = closestVertical;
      }
    }
    
    // 吸附到最近的水平线
    if (lines.horizontal.length > 0) {
      const closestHorizontal = lines.horizontal.reduce((prev, curr) =>
        Math.abs(curr - pos.y) < Math.abs(prev - pos.y) ? curr : prev
      );
      if (Math.abs(closestHorizontal - pos.y) < SNAP_THRESHOLD) {
        newY = closestHorizontal;
      }
    }
    
    return { x: newX, y: newY };
  };

  // 处理人脸缩放
  const handleScale = (faceId: string, delta: number) => {
    setFaces(prevFaces =>
      prevFaces.map(face =>
        face.id === faceId
          ? { ...face, scale: Math.max(0.5, Math.min(3.0, face.scale + delta)) }
          : face
      )
    );
  };

  // 处理人脸旋转
  const handleRotate = (faceId: string, delta: number) => {
    setFaces(prevFaces =>
      prevFaces.map(face =>
        face.id === faceId
          ? { ...face, rotation: (face.rotation + delta) % 360 }
          : face
      )
    );
  };

  // 完成定位
  const handleComplete = () => {
    const positions = faces.map(face => ({
      x: face.x,
      y: face.y,
      scale: face.scale,
      rotation: face.rotation,
    }));
    onComplete(positions);
  };

  // 选中的人脸
  const selectedFace = faces.find(face => face.id === selectedFaceId);

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex flex-col">
      {/* 顶部工具栏 */}
      <div className="bg-white/90 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
        <button
          onClick={onCancel}
          className="text-gray-700 flex items-center"
        >
          <i className="fas fa-times mr-2"></i>
          取消
        </button>
        <h2 className="text-lg font-semibold text-gray-800">调整人脸位置</h2>
        <button
          onClick={handleComplete}
          className="text-[#6B5CA5] font-semibold flex items-center"
        >
          <i className="fas fa-check mr-2"></i>
          完成
        </button>
      </div>

      {/* 画布区域 */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={canvasRef}
          className="absolute inset-0 flex items-center justify-center"
          onMouseMove={handleDrag}
          onMouseUp={handleDragEnd}
          onTouchMove={handleDrag}
          onTouchEnd={handleDragEnd}
        >
          {/* 背景图片 */}
          <div className="relative">
            <img
              ref={backgroundImageRef}
              src={backgroundUrl}
              alt="Background Template"
              className="max-w-full max-h-[70vh] object-contain"
              draggable={false}
            />
            
            {/* 网格线 */}
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none">
                <svg className="w-full h-full">
                  <defs>
                    <pattern
                      id="grid"
                      width="40"
                      height="40"
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d="M 40 0 L 0 0 0 40"
                        fill="none"
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth="1"
                      />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              </div>
            )}
            
            {/* 对齐线 */}
            {showAlignmentLines && isDragging && (
              <div className="absolute inset-0 pointer-events-none">
                <svg className="w-full h-full">
                  {/* 垂直对齐线 */}
                  {alignmentLines.vertical.map((x, index) => (
                    <line
                      key={`v-${index}`}
                      x1={x}
                      y1="0"
                      x2={x}
                      y2="100%"
                      stroke="#6B5CA5"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                    />
                  ))}
                  {/* 水平对齐线 */}
                  {alignmentLines.horizontal.map((y, index) => (
                    <line
                      key={`h-${index}`}
                      x1="0"
                      y1={y}
                      x2="100%"
                      y2={y}
                      stroke="#6B5CA5"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                    />
                  ))}
                </svg>
              </div>
            )}
            
            {/* 人脸图片 */}
            {faces.map(face => (
              <motion.div
                key={face.id}
                className={`absolute cursor-move ${
                  selectedFaceId === face.id ? 'ring-2 ring-[#6B5CA5]' : ''
                }`}
                style={{
                  left: face.x,
                  top: face.y,
                  transform: `scale(${face.scale}) rotate(${face.rotation}deg)`,
                  transformOrigin: 'center',
                }}
                onMouseDown={(e) => handleDragStart(face.id, e)}
                onTouchStart={(e) => handleDragStart(face.id, e)}
                onClick={() => setSelectedFaceId(face.id)}
              >
                <img
                  src={`data:image/png;base64,${face.imageBase64}`}
                  alt={`Face ${face.id}`}
                  className="w-24 h-24 object-cover rounded-lg border-2 border-white shadow-lg"
                  draggable={false}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* 底部控制栏 */}
      <div className="bg-white/90 backdrop-blur-sm px-4 py-4">
        {/* 辅助功能开关 */}
        <div className="flex items-center justify-center space-x-4 mb-4">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-3 py-2 rounded-lg flex items-center text-sm ${
              showGrid
                ? 'bg-[#6B5CA5] text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            <i className={`fas fa-${showGrid ? 'eye' : 'eye-slash'} mr-1`}></i>
            网格线
          </button>
          <button
            onClick={() => setShowAlignmentLines(!showAlignmentLines)}
            className={`px-3 py-2 rounded-lg flex items-center text-sm ${
              showAlignmentLines
                ? 'bg-[#6B5CA5] text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            <i className={`fas fa-${showAlignmentLines ? 'check' : 'times'} mr-1`}></i>
            对齐吸附
          </button>
        </div>

        {/* 选中人脸的控制按钮 */}
        {selectedFace && (
          <div className="space-y-3">
            <div className="text-center text-sm text-gray-600 mb-2">
              已选中人脸 {faces.findIndex(f => f.id === selectedFaceId) + 1}
            </div>
            
            {/* 缩放控制 */}
            <div className="flex items-center justify-center space-x-4">
              <span className="text-sm text-gray-700 w-16">缩放:</span>
              <button
                onClick={() => handleScale(selectedFace.id, -0.1)}
                className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center"
              >
                <i className="fas fa-minus"></i>
              </button>
              <span className="text-sm font-semibold w-16 text-center">
                {(selectedFace.scale * 100).toFixed(0)}%
              </span>
              <button
                onClick={() => handleScale(selectedFace.id, 0.1)}
                className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center"
              >
                <i className="fas fa-plus"></i>
              </button>
            </div>

            {/* 旋转控制 */}
            <div className="flex items-center justify-center space-x-4">
              <span className="text-sm text-gray-700 w-16">旋转:</span>
              <button
                onClick={() => handleRotate(selectedFace.id, -15)}
                className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center"
              >
                <i className="fas fa-undo"></i>
              </button>
              <span className="text-sm font-semibold w-16 text-center">
                {selectedFace.rotation.toFixed(0)}°
              </span>
              <button
                onClick={() => handleRotate(selectedFace.id, 15)}
                className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center"
              >
                <i className="fas fa-redo"></i>
              </button>
            </div>
          </div>
        )}

        {/* 人脸列表 */}
        <div className="mt-4">
          <div className="text-sm text-gray-600 mb-2 text-center">
            点击选择要调整的人脸
          </div>
          <div className="flex justify-center space-x-2 overflow-x-auto">
            {faces.map((face, index) => (
              <button
                key={face.id}
                onClick={() => setSelectedFaceId(face.id)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                  selectedFaceId === face.id
                    ? 'border-[#6B5CA5] ring-2 ring-[#6B5CA5]'
                    : 'border-gray-300'
                }`}
              >
                <img
                  src={`data:image/png;base64,${face.imageBase64}`}
                  alt={`Face ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
