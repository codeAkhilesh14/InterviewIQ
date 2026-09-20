import React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/Card.jsx"
import { Badge } from "../ui/Badge.jsx"

const KIND_LABEL = { technical: "Technical", behavioural: "Behavioural", domain: "Domain" }

const RoleOverview = ({ role }) => (
    <Card>
        <CardHeader>
            <CardTitle>{role.title || "Role"}{role.seniority ? ` · ${role.seniority}` : ""}</CardTitle>
            <CardDescription>Extracted from the job description - nothing here is invented beyond what it stated.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
            {role.responsibilities?.length > 0 && (
                <div>
                    <p className="mb-2 text-sm font-medium">Responsibilities</p>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                        {role.responsibilities.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                </div>
            )}

            <div>
                <p className="mb-2 text-sm font-medium">Requirements ({role.requirements.length})</p>
                {role.requirements.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No clear requirements could be extracted from this description.</p>
                ) : (
                    <ul className="flex flex-col gap-2">
                        {role.requirements.map((req) => (
                            <li key={req.id} className="flex items-start gap-2 rounded-lg border border-border p-3">
                                <div className="flex shrink-0 gap-1.5">
                                    <Badge variant={req.priority === "must" ? "default" : "secondary"}>{req.priority === "must" ? "Must" : "Nice"}</Badge>
                                    <Badge variant="outline">{KIND_LABEL[req.kind] || req.kind}</Badge>
                                </div>
                                <p className="text-sm">{req.text}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </CardContent>
    </Card>
)

export default RoleOverview
