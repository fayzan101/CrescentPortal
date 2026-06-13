import Sales from '@/components/sales/Sales';
import React, { Suspense } from 'react'

const Page = () => {
  return (
    <div className="flex flex-col gap-5">
        <Suspense fallback={<div className="text-sm text-gray-500 p-4">Loading sales...</div>}>
          <Sales />
        </Suspense>
    </div>
  )
}

export default Page;