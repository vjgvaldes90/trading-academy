import Navbar from "@/components/landing/Navbar"
import SiteFooter from "@/components/shared/SiteFooter"
import DisclaimerContent from "@/components/disclaimer/DisclaimerContent"

export default function DisclaimerPage() {
    return (
        <div className="min-h-screen bg-[#020617] text-white">
            <Navbar />
            <main className="mx-auto w-full max-w-4xl px-6 pb-16 pt-32 sm:px-8">
                <DisclaimerContent />
            </main>
            <SiteFooter />
        </div>
    )
}
