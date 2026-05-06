import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'

export function ProfileForm() {
  return (
    <Card className="p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Input placeholder="Förnamn" defaultValue="Hekmat" />
        <Input placeholder="Efternamn" defaultValue="Hourani" />
        <Input placeholder="E-post" defaultValue="hekmat@example.com" />
        <Input placeholder="Telefon" defaultValue="+46 70 123 45 67" />
        <Select defaultValue="employed">
          <option value="employed">Anställd</option>
          <option value="self_employed">Egenföretagare</option>
          <option value="student">Student</option>
        </Select>
        <Input placeholder="Månadsinkomst" defaultValue="42000" />
        <Input placeholder="Önskat område" defaultValue="Stockholm, Göteborg" />
        <Input placeholder="Önskat inflyttningsdatum" defaultValue="2026-06-01" />
      </div>
      <div className="mt-5 flex justify-end">
        <Button>Spara profil</Button>
      </div>
    </Card>
  )
}
