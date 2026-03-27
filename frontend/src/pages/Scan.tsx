import { useNavigate } from 'react-router-dom'
import { Camera, Upload, Lightbulb } from 'lucide-react'
import { TopAppBar } from '@/components/TopAppBar'
import { PageLayout } from '@/components/PageLayout'
import { Button } from '@/components/ui/button'

export default function Scan() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-ds-surface dark:bg-ds-surface">
      <TopAppBar />
      <PageLayout className="flex flex-col gap-6">
        {/* Page header */}
        <div className="space-y-1">
          <h2 className="font-headline font-extrabold text-3xl text-ds-on-surface tracking-tight leading-tight">
            Capture your <br />
            <span className="text-ds-primary">Receipts.</span>
          </h2>
          <p className="font-body text-ds-on-surface-variant text-sm max-w-[80%]">
            Snap or import a photo of your paper receipt to automatically split the bill with friends.
          </p>
        </div>

        {/* Viewfinder — background shift surface, no border (design rule) */}
        <div className="relative bg-ds-surface-container-low dark:bg-ds-surface-container rounded-[2rem] aspect-[3/4] w-full flex items-center justify-center overflow-hidden">
          {/* Subtle gradient overlay for depth */}
          <div className="absolute inset-0 opacity-40 mix-blend-overlay bg-gradient-to-tr from-ds-surface-container to-ds-surface-container-lowest pointer-events-none" />

          {/* Dashed inner guide */}
          <div className="absolute inset-8 border-2 border-dashed border-ds-outline-variant opacity-30 rounded-xl pointer-events-none" />

          {/* Corner marks — intentional 2px accent lines, NOT a full border */}
          {[
            'top-4 left-4 border-t-2 border-l-2',
            'top-4 right-4 border-t-2 border-r-2',
            'bottom-4 left-4 border-b-2 border-l-2',
            'bottom-4 right-4 border-b-2 border-r-2',
          ].map((pos, i) => (
            <div
              key={i}
              className={`absolute w-8 h-8 ${pos} border-ds-primary rounded-sm`}
            />
          ))}

          {/* Camera icon centerpiece */}
          <div className="relative flex flex-col items-center text-center px-12">
            <div className="w-20 h-20 mb-5 bg-ds-primary-container dark:bg-ds-surface-container-high rounded-full flex items-center justify-center shadow-sm">
              <Camera className="w-9 h-9 text-ds-on-primary-container dark:text-ds-primary" />
            </div>
            <h3 className="font-headline text-lg font-bold text-ds-on-surface">No receipt selected</h3>
            <p className="text-sm text-ds-on-surface-variant mt-1">
              Position the paper clearly in the frame for best results.
            </p>
          </div>

        </div>

        {/* Primary action buttons */}
        <div className="flex gap-3">
          <Button variant="pill" className="flex-1 gap-2">
            <Camera className="w-4 h-4" />
            Take Photo
          </Button>
          <Button variant="pill-ghost" className="flex-1 gap-2">
            <Upload className="w-4 h-4" />
            Upload
          </Button>
        </div>

        {/* Tips section */}
        <div className="bg-ds-surface-container-low dark:bg-ds-surface-container p-5 rounded-[1.5rem] flex items-start gap-4">
          <div className="text-ds-primary mt-0.5 shrink-0">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-label text-sm font-bold text-ds-on-surface">Scanning Tips</h4>
            <p className="text-xs text-ds-on-surface-variant mt-1 leading-relaxed">
              Place the receipt on a dark background and ensure good lighting for 99% accuracy in item detection.
            </p>
          </div>
        </div>

        {/* Continue to analysis */}
        <Button
          variant="pill"
          className="w-full mt-2"
          onClick={() => navigate('/review')}
        >
          Analyze Receipt
        </Button>
      </PageLayout>
    </div>
  )
}
