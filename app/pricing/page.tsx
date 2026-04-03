import Navbar from "@/components/landing/Navbar"
import Pricing from "@/components/landing/Pricing"

/** TEMP: sin redirect por usuario ya pagado */
export default function PricingPage() {
    return (
        <div className="min-h-screen bg-[#020617]">
            <Navbar />
            <Pricing />
        </div>
    )
}
