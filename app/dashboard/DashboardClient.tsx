'use client'

import DashboardHeader from './DashboardHeader'
import LinkList from './link/LinkList'

export default function DashboardClient({ userEmail }: { userEmail: string }) {
  return (
    <>
      <DashboardHeader userEmail={userEmail} />
      <LinkList />
    </>
  )
}
