export type ProvisionStudentInput = {
    firstName: string
    lastName: string
    email: string
    phone?: string
    accessType: "free" | "paid" | "vip" | "discount"
}

export type ProvisionStudentResult = {
    success: boolean
    message: string
}

export async function provisionAcademyStudent(
    input: ProvisionStudentInput
): Promise<ProvisionStudentResult> {
    if (!input) {
        throw new Error("Missing input")
    }

    return {
        success: true,
        message: "Not implemented yet",
    }
}
