import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import LaunchScreen from "@/pages/LaunchScreen";
import FunctionSelector from "@/pages/FunctionSelector";
import LandingPage from "@/pages/LandingPage";
import GeneratorPage from "@/pages/GeneratorPage";
import UploadPage from "@/pages/UploadPage";
import TemplateSelector from "@/pages/TemplateSelector";
import GeneratingPage from "@/pages/GeneratingPage";
import ResultPage from "@/pages/ResultPage";
import CardEditor from "@/pages/CardEditor";
import ErrorHandlingDemo from "@/pages/ErrorHandlingDemo";
import { UserProvider } from "@/contexts/UserContext";
import { ElderModeProvider } from "@/contexts/ElderModeContext";
import { MusicProvider } from "@/contexts/MusicContext";
import MusicToggle from "@/components/MusicToggle";
import ErrorBoundary from "@/components/ErrorBoundary";

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* 启动页 */}
        <Route path="/" element={<LaunchScreen />} />
        
        {/* 功能选择页 */}
        <Route path="/function-selector" element={<FunctionSelector />} />
        
        {/* 上传页面 */}
        <Route path="/upload" element={<UploadPage />} />
        
        {/* 模板选择页 */}
        <Route path="/template" element={<TemplateSelector />} />
        
        {/* 生成等待页 */}
        <Route path="/generating" element={<GeneratingPage />} />
        
        {/* 结果筛选页 (4宫格选择在GeneratorPage中) */}
        <Route path="/result-selector" element={<GeneratorPage />} />
        
        {/* 成果页 */}
        <Route path="/result" element={<ResultPage />} />
        
        {/* 贺卡编辑页 */}
        <Route path="/card-editor" element={<CardEditor />} />
        
        {/* 产品订单页 (集成在ResultPage中) */}
        <Route path="/product-order" element={<ResultPage />} />
        
        {/* 错误处理演示页 */}
        <Route path="/error-demo" element={<ErrorHandlingDemo />} />
        
        {/* 旧路由保持兼容 */}
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/generator" element={<GeneratorPage />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <UserProvider>
        <ElderModeProvider>
          <MusicProvider>
            <AnimatedRoutes />
            
            {/* 全局音乐控制按钮 */}
            <MusicToggle />
          </MusicProvider>
        </ElderModeProvider>
      </UserProvider>
    </ErrorBoundary>
  );
}
