import Navbar from "@/components/landing/Navbar"
import Pricing from "@/components/landing/Pricing"
import SiteFooter from "@/components/shared/SiteFooter"

export default function PricingPage() {
    return (
        <div className="min-h-screen bg-[#020617]">
            <Navbar />
            <Pricing />
            <SiteFooter />
        </div>
    )
}
