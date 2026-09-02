import CalibrationStudio from "./studio";
import TwinPage from "../twin/page";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  return view === "simulation" ? <TwinPage /> : <CalibrationStudio />;
}
