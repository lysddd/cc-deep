import { PrivacyPolicy } from '@/components/compliance/privacy-policy'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto bg-white rounded-xl border p-8">
        <PrivacyPolicy />
      </div>
    </div>
  )
}
