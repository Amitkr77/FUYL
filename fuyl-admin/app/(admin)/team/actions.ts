'use server'

import { revalidatePath } from 'next/cache'
import { listStaff, createStaff, updateStaff, deleteStaff, type StaffMember } from '@/lib/staff'
import { getErrorMessage } from '@/lib/api'

export async function listStaffAction(): Promise<StaffMember[]> {
  return listStaff()
}

export async function createStaffAction(data: {
  email: string
  firstName?: string
  lastName?: string
  role: 'admin' | 'staff'
  permissions: string[]
  password: string
}): Promise<StaffMember | { error: string }> {
  try {
    const member = await createStaff(data)
    revalidatePath('/team')
    return member
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not create staff member.') }
  }
}

export async function updateStaffAction(
  id: string,
  data: Partial<{ firstName: string; lastName: string; role: 'admin' | 'staff'; permissions: string[]; isActive: boolean }>
): Promise<StaffMember | { error: string }> {
  try {
    const member = await updateStaff(id, data)
    revalidatePath('/team')
    return member
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not update staff member.') }
  }
}

export async function deleteStaffAction(id: string): Promise<{ success: true } | { error: string }> {
  try {
    await deleteStaff(id)
    revalidatePath('/team')
    return { success: true }
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not deactivate staff member.') }
  }
}
