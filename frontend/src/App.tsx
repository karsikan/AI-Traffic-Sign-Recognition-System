import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import HomePage from "./pages/HomePage";
import ImageDetectionPage from "./pages/ImageDetectionPage";
import VideoDetectionPage from "./pages/VideoDetectionPage";
import WebcamDetectionPage from "./pages/WebcamDetectionPage";
import BatchDetectionPage from "./pages/BatchDetectionPage";
import AssistantPage from "./pages/AssistantPage";
import NearbyPage from "./pages/NearbyPage";
import EmergencyPage from "./pages/EmergencyPage";
import HistoryPage from "./pages/HistoryPage";
import AboutPage from "./pages/AboutPage";
import TrafficSignGuidePage from "./pages/TrafficSignGuidePage";
import ForeignDriverPage from "./pages/ForeignDriverPage";
import TranslationPage from "./pages/TranslationPage";
import ModelPage from "./pages/ModelPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import QuizPage from "./pages/QuizPage";
import SpeedLimitPage from "./pages/SpeedLimitPage";
import WeatherPage from "./pages/WeatherPage";
import DrivingLicensePage from "./pages/DrivingLicensePage";
import DocumentScannerPage from "./pages/DocumentScannerPage";
import FineGuidePage from "./pages/FineGuidePage";
import FineCalculator from "./pages/FineCalculator";
import PoliceStopPage from "./pages/PoliceStopPage";
import MyFinesPage from "./pages/MyFinesPage";
import DocumentLockerPage from "./pages/DocumentLockerPage";
import DemeritPage from "./pages/DemeritPage";
import IncidentRecorderPage from "./pages/IncidentRecorderPage";
import CheckpointsPage from "./pages/CheckpointsPage";
import FatiguePage from "./pages/FatiguePage";
import SpeedometerPage from "./pages/SpeedometerPage";
import SignTrainerPage from "./pages/SignTrainerPage";
import VehicleClearancePage from "./pages/VehicleClearancePage";
import ExpresswayPage from "./pages/ExpresswayPage";
import FuelPage from "./pages/FuelPage";
import TransferPage from "./pages/TransferPage";
import ClaimHubPage from "./pages/ClaimHubPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/detect/image"  element={<ImageDetectionPage />} />
        <Route path="/detect/video"  element={<VideoDetectionPage />} />
        <Route path="/detect/webcam" element={<WebcamDetectionPage />} />
        <Route path="/detect/batch"  element={<BatchDetectionPage />} />
        <Route path="/assistant"     element={<AssistantPage />} />
        <Route path="/translate"     element={<TranslationPage />} />
        <Route path="/nearby"        element={<NearbyPage />} />
        <Route path="/emergency"     element={<EmergencyPage />} />
        <Route path="/history"       element={<HistoryPage />} />
        <Route path="/analytics"     element={<AnalyticsPage />} />
        <Route path="/model"         element={<ModelPage />} />
        <Route path="/signs"         element={<TrafficSignGuidePage />} />
        <Route path="/foreign"       element={<ForeignDriverPage />} />
        <Route path="/about"         element={<AboutPage />} />
        <Route path="/quiz"          element={<QuizPage />} />
        <Route path="/speedlimits"   element={<SpeedLimitPage />} />
        <Route path="/weather"        element={<WeatherPage />} />
        <Route path="/drivinglicense" element={<DrivingLicensePage />} />
        <Route path="/documents"      element={<DocumentScannerPage />} />
        <Route path="/fines"          element={<FineGuidePage />} />
        <Route path="/fines/convert"  element={<FineCalculator />} />
        <Route path="/police-stop"    element={<PoliceStopPage />} />
        <Route path="/my-fines"       element={<MyFinesPage />} />
        <Route path="/locker"         element={<DocumentLockerPage />} />
        <Route path="/demerit"        element={<DemeritPage />} />
        <Route path="/incidents"      element={<IncidentRecorderPage />} />
        <Route path="/checkpoints"    element={<CheckpointsPage />} />
        <Route path="/fatigue"        element={<FatiguePage />} />
        <Route path="/speedometer"    element={<SpeedometerPage />} />
        <Route path="/trainer"        element={<SignTrainerPage />} />
        <Route path="/clearance"      element={<VehicleClearancePage />} />
        <Route path="/expressway"     element={<ExpresswayPage />} />
        <Route path="/fuel"           element={<FuelPage />} />
        <Route path="/transfer"       element={<TransferPage />} />
        <Route path="/claim"          element={<ClaimHubPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
