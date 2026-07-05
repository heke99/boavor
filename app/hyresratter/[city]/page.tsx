import { redirect } from 'next/navigation'

type Props = { params: Promise<{ city: string }> }

/** /hyresratter/[city] is an alias — /lediga-lagenheter/[city] is canonical. */
export default async function HyresratterCityPage({ params }: Props) {
  const { city } = await params
  redirect(`/lediga-lagenheter/${city}`)
}
