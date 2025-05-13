import FileUploadSection from "@/components/dog-detect/file-upload-section";

export default function Home() {
  return (
    <main className="min-h-screen">
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-center mb-8">
          Dog Detection Interface
        </h1>

        <FileUploadSection />
      </div>
    </main>
  );
}
