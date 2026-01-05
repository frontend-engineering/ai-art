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
import PuzzleLaunchScreen from "@/pages/modes/PuzzleLaunchScreen";
import TransformLaunchScreen from "@/pages/modes/TransformLaunchScreen";
import TransformUploadPage from "@/pages/modes/TransformUploadPage";
import TransformHistoryPage from "@/pages/modes/TransformHistoryPage";
import ResultSelectorPage from "@/pages/ResultSelectorPage";
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
        {/* 主页 - 默认跳转到时空拼图 */}
        <Route path="/" element={<LaunchScreen />} />
        
        {/* 时空拼图模式 */}
        <Route path="/puzzle" element={<PuzzleLaunchScreen />} />
        <Route path="/puzzle/upload" element={<UploadPage />} />
        <Route path="/puzzle/template" element={<TemplateSelector />} />
        <Route path="/puzzle/generating" element={<GeneratingPage />} />
        <Route path="/puzzle/result-selector" element={<ResultSelectorPage />} />
        <Route path="/puzzle/result" element={<ResultPage />} />
        
        {/* 富贵变身模式 */}
        <Route path="/transform" element={<TransformLaunchScreen />} />
        <Route path="/transform/upload" element={<TransformUploadPage />} />
        <Route path="/transform/template" element={<TemplateSelector />} />
        <Route path="/transform/generating" element={<GeneratingPage />} />
        <Route path="/transform/result-selector" element={<ResultSelectorPage />} />
        <Route path="/transform/result" element={<ResultPage />} />
        <Route path="/transform/history" element={<TransformHistoryPage />} />
        
        {/* 贺卡编辑页 */}
        <Route path="/card-editor" element={<CardEditor />} />
        
        {/* 旧路由保持兼容（逐步废弃） */}
        <Route path="/function-selector" element={<FunctionSelector />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/template" element={<TemplateSelector />} />
        <Route path="/generating" element={<GeneratingPage />} />
        <Route path="/result-selector" element={<GeneratorPage />} />
        <Route path="/result" element={<ResultPage />} />
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
