import { Routes, Route } from "react-router-dom";
import LaunchScreen from "@/pages/LaunchScreen";
import FunctionSelector from "@/pages/FunctionSelector";
import LandingPage from "@/pages/LandingPage";
import GeneratorPage from "@/pages/GeneratorPage";
import UploadPage from "@/pages/UploadPage";
import TemplateSelector from "@/pages/TemplateSelector";
import GeneratingPage from "@/pages/GeneratingPage";
import ResultPage from "@/pages/ResultPage";
import CardEditor from "@/pages/CardEditor";
import { UserProvider } from "@/contexts/UserContext";

export default function App() {
  return (
    <UserProvider>
      <Routes>
        <Route path="/" element={<LaunchScreen />} />
        <Route path="/function-selector" element={<FunctionSelector />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/generator" element={<GeneratorPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/template" element={<TemplateSelector />} />
        <Route path="/generating" element={<GeneratingPage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/card-editor" element={<CardEditor />} />
      </Routes>
    </UserProvider>
  );
}
