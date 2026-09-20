import React from "react"
import { Link, Navigate } from "react-router-dom"
import { useSelector } from "react-redux"
import { Sparkles, FileText, ListChecks, BookOpen, CalendarDays } from "lucide-react"
import { Button } from "../components/ui/Button.jsx"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card.jsx"
import ThemeToggle from "../components/layout/ThemeToggle.jsx"

const FEATURES = [
    { icon: FileText, title: "Company research", desc: "Crawls the company site and public discussion of their interview process." },
    { icon: ListChecks, title: "Question bank", desc: "Categorised technical, behavioural, system-design and company-fit questions." },
    { icon: BookOpen, title: "Flashcards", desc: "Practice mode with confidence tracking, ordered by what you're shakiest on." },
    { icon: CalendarDays, title: "Study schedule", desc: "A day-by-day plan that fits exactly the time you have before the interview." }
]

const Landing = () => {
    const authStatus = useSelector((state) => state.user.authStatus)
    if (authStatus === "authenticated") return <Navigate to="/dashboard" replace />

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <span className="text-lg font-semibold">InterviewIQ</span>
                </div>
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <Button variant="ghost" asChild><Link to="/login">Log in</Link></Button>
                    <Button asChild><Link to="/register">Get started</Link></Button>
                </div>
            </header>

            <main className="mx-auto max-w-5xl px-6 py-16 text-center">
                <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
                    Turn a job description into a personalised interview prep kit
                </h1>
                <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                    Paste a job description and a company URL. InterviewIQ researches the company,
                    finds their hiring process, and builds a company brief, question bank,
                    flashcards and a day-by-day schedule - then lets you reshape any of it.
                </p>
                <div className="mt-8 flex justify-center gap-3">
                    <Button size="lg" asChild><Link to="/register">Create your first kit</Link></Button>
                    <Button size="lg" variant="outline" asChild><Link to="/login">I already have an account</Link></Button>
                </div>

                <div className="mt-16 grid grid-cols-1 gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
                    {FEATURES.map(({ icon: Icon, title, desc }) => (
                        <Card key={title}>
                            <CardHeader>
                                <Icon className="mb-2 h-5 w-5 text-primary" />
                                <CardTitle className="text-base">{title}</CardTitle>
                                <CardDescription>{desc}</CardDescription>
                            </CardHeader>
                            <CardContent />
                        </Card>
                    ))}
                </div>
            </main>
        </div>
    )
}

export default Landing
