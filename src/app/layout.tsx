import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Apprends les Maths',
  description: 'Entraîne-toi aux maths de 6ème',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full">
      <body className="min-h-full bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  )
}
