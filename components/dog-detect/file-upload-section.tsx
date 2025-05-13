"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, ImageIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import NextImage from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import ObjectDetectionImage from "@/mediapipe/object-detection-image"
import initMediaPipVision from "@/mediapipe/mediapipe-vision"

// Interface cho kết quả tải mô hình
interface ModelLoadResult {
  modelName: string
  mode: string
  loadResult: boolean
}

interface Category {
  score: number
  index: number
  categoryName: string
  displayName: string
}

interface ObjectDetectorResult {
  categories: Category[] // List of categories
  keypoints: any[] // Assuming keypoints is an empty array for now
  boundingBox: {
    originX: number
    originY: number
    width: number
    height: number
    angle: number
  }
}

export default function FileUploadSection() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [processing, setProcessing] = useState<boolean>(false)
  const [modelLoaded, setModelLoaded] = useState<boolean>(false)
  const [detectionResult, setDetectionResult] = useState<ObjectDetectorResult[]>([])
  const imageRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  console.log("FileUploadSection======>", detectionResult)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0]
      setFile(selectedFile)
      setPreview(URL.createObjectURL(selectedFile))
      // Reset detection results when a new image is uploaded
      setDetectionResult([])
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    maxFiles: 1,
  })

  const handleDetect = async () => {
    if (!file) return
    setProcessing(true)

    try {
      const img = new window.Image()
      img.crossOrigin = "anonymous"
      img.src = URL.createObjectURL(file)

      // Đảm bảo giữ nguyên tỷ lệ ảnh
      img.style.width = "auto"
      img.style.height = "auto"

      img.onload = async () => {
        try {
          const vision = await initMediaPipVision()
          await ObjectDetectionImage.initModel(vision)
          console.log("Model loaded successfully")
          setModelLoaded(true)

          const detection = await ObjectDetectionImage.detectObject(img)
          const det = detection?.detections

          if (Array.isArray(det)) {
            setDetectionResult(
              det.map((det: any) => {
                console.log("det: ", det)
                return {
                  categories: det.categories.map((category: any) => ({
                    score: category.score,
                    index: category.index,
                    categoryName: category.categoryName,
                    displayName: category.displayName || "",
                  })),
                  keypoints: det.keypoints || [],
                  boundingBox: {
                    originX: det.boundingBox.originX,
                    originY: det.boundingBox.originY,
                    width: det.boundingBox.width,
                    height: det.boundingBox.height,
                    angle: det.boundingBox.angle,
                  },
                }
              }),
            )
          } else {
            setDetectionResult([])
          }

          console.log("Detection result:==============>", detection)
        } catch (error) {
          console.error("Detection failed:", error)
        }
      }
    } catch (error) {
      console.error("Error in handleDetect:", error)
    } finally {
      setProcessing(false)
    }
  }

  // Draw bounding boxes on canvas when detection results change
  useEffect(() => {
    if (detectionResult.length > 0 && imageRef.current && canvasRef.current) {
      const img = imageRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")

      if (!ctx) return

      // Set canvas dimensions to match the image
      canvas.width = img.width
      canvas.height = img.height

      // Clear previous drawings
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw the bounding boxes
      detectionResult.forEach((result) => {
        const { originX, originY, width, height } = result.boundingBox

        // Calculate coordinates relative to the image dimensions
        const x = originX * img.width
        const y = originY * img.height
        const boxWidth = width * img.width
        const boxHeight = height * img.height

        // Draw rectangle
        ctx.strokeStyle = "#22c55e"
        ctx.lineWidth = 3
        ctx.strokeRect(x, y, boxWidth, boxHeight)

        // Draw label background
        const label = result.categories[0]?.displayName || result.categories[0]?.categoryName || "Unknown"
        const score = result.categories[0]?.score || 0
        const text = `${label} (${(score * 100).toFixed(0)}%)`

        const textMetrics = ctx.measureText(text)
        const textWidth = textMetrics.width + 10
        const textHeight = 24

        ctx.fillStyle = "rgba(34, 197, 94, 0.7)"
        ctx.fillRect(x, y - textHeight, textWidth, textHeight)

        // Draw label text
        ctx.fillStyle = "white"
        ctx.font = "14px Arial"
        ctx.fillText(text, x + 5, y - 7)
      })
    }
  }, [detectionResult])

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Object Detection with MediaPipe</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 cursor-pointer transition-all duration-200 ${
              isDragActive ? "border-green-500 bg-green-50" : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <input {...getInputProps()} />
            <div className="text-center">
              <div className="mx-auto bg-gray-100 rounded-full p-4 w-16 h-16 flex items-center justify-center mb-4">
                <Upload className="h-8 w-8 text-gray-500" />
              </div>
              {isDragActive ? (
                <p className="text-green-600 font-medium">Drop the image here...</p>
              ) : (
                <>
                  <p className="font-medium text-gray-700 mb-1">Drag & drop an image here, or click to select</p>
                  <p className="text-sm text-gray-500">Supports JPG, PNG, WEBP</p>
                </>
              )}
            </div>
          </div>

          {preview && (
            <div className="mt-6 relative">
              <div className="relative inline-block">
                <div className="relative">
                  <NextImage
                    ref={imageRef}
                    src={preview}
                    alt="Preview"
                    width={500}
                    height={500}
                    className="rounded-lg max-h-[500px] w-auto object-contain mx-auto border border-gray-200"
                  />
                  <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />
                </div>
              </div>

              <div className="mt-4 flex justify-center">
                <Button
                  onClick={handleDetect}
                  disabled={processing || !file}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700"
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="mr-2 h-4 w-4" />
                      Detect Objects
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {detectionResult.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Detection Results</h2>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="space-y-4">
                  {detectionResult.map((result, index) => (
                    <Card key={index} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex flex-col gap-2">
                          <div>
                            <span className="font-medium text-gray-700">Object {index + 1}:</span>{" "}
                            <div className="flex flex-wrap gap-2 mt-2">
                              {result.categories.map((cat, catIndex) => (
                                <Badge
                                  key={catIndex}
                                  variant="outline"
                                  className="bg-green-50 text-green-700 border-green-200"
                                >
                                  {cat.displayName || cat.categoryName}{" "}
                                  <span className="ml-1 font-bold">{(cat.score * 100).toFixed(0)}%</span>
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <Separator className="my-2" />

                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Bounding Box:</span>{" "}
                            {result.boundingBox ? (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                                <div className="bg-gray-100 p-2 rounded">
                                  <span className="font-medium">X:</span> {result.boundingBox.originX.toFixed(3)}
                                </div>
                                <div className="bg-gray-100 p-2 rounded">
                                  <span className="font-medium">Y:</span> {result.boundingBox.originY.toFixed(3)}
                                </div>
                                <div className="bg-gray-100 p-2 rounded">
                                  <span className="font-medium">Width:</span> {result.boundingBox.width.toFixed(3)}
                                </div>
                                <div className="bg-gray-100 p-2 rounded">
                                  <span className="font-medium">Height:</span> {result.boundingBox.height.toFixed(3)}
                                </div>
                              </div>
                            ) : (
                              <span>No bounding box data available</span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
