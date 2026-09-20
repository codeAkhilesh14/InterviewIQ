import express from "express"
import isAuth from "../middlewares/isAuth.js"
import {
    createKit, createKitsBatch, listKits, getKit, deleteKit,
    updateCompanyBrief,
    addQuestion, updateQuestion, deleteQuestion, toggleQuestionPin, reorderQuestions,
    addFlashcard, updateFlashcard, deleteFlashcard,
    regenerateSection, logPractice
} from "../controllers/kit.controller.js"

const kitRouter = express.Router()

kitRouter.use(isAuth)

kitRouter.post("/", createKit)
kitRouter.post("/batch", createKitsBatch)
kitRouter.get("/", listKits)
kitRouter.get("/:id", getKit)
kitRouter.delete("/:id", deleteKit)

kitRouter.put("/:id/company-brief", updateCompanyBrief)

kitRouter.post("/:id/questions", addQuestion)
kitRouter.put("/:id/questions/reorder", reorderQuestions)
kitRouter.put("/:id/questions/:qid", updateQuestion)
kitRouter.delete("/:id/questions/:qid", deleteQuestion)
kitRouter.put("/:id/questions/:qid/pin", toggleQuestionPin)

kitRouter.post("/:id/flashcards", addFlashcard)
kitRouter.put("/:id/flashcards/:fid", updateFlashcard)
kitRouter.delete("/:id/flashcards/:fid", deleteFlashcard)

kitRouter.post("/:id/regenerate", regenerateSection)
kitRouter.post("/:id/practice", logPractice)

export default kitRouter
