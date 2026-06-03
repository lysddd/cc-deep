import { TermsOfService } from '@/components/compliance/terms-of-service'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto bg-white rounded-xl border p-8">
        <TermsOfService />
      </div>
    </div>
  )
}
