import { ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { TEAMS } from "@/data/fakeData";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-muted-foreground">{label}</Label>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

export default function ProfileView() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 text-lg">
              <AvatarFallback>GK</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>Giorgi Kumelashvili</CardTitle>
              <CardDescription>giorgi.kumelashvili@tipalti.com</CardDescription>
            </div>
            <Badge variant="success" className="ml-auto gap-1"><ShieldCheck className="h-3.5 w-3.5" /> SSO</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Separator className="mb-5" />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Sign-in" value="Tipalti SSO (SAML)" />
            <Field label="Role" value="Viewer — read-only (v1)" />
            <Field label="Org" value="SRE / DevOps" />
            <Field label="Member since" value="05-2026" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Access</CardTitle>
          <CardDescription>v1 is read-only for every role (epic non-functional requirement). No write-back to source platforms.</CardDescription>
        </CardHeader>
        <CardContent>
          <Label className="text-muted-foreground">Teams visible to you</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {TEAMS.map((t) => <Badge key={t} variant="secondary" className="capitalize">{t}</Badge>)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
