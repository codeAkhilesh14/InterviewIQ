import { createSlice } from "@reduxjs/toolkit"

const kitSlice = createSlice({
    name: "kit",
    initialState: {
        list: [],
        listStatus: "idle", // idle | loading | loaded | error
        current: null,
        currentStatus: "idle"
    },
    reducers: {
        setKitList: (state, action) => {
            state.list = action.payload
            state.listStatus = "loaded"
        },
        setKitListStatus: (state, action) => {
            state.listStatus = action.payload
        },
        upsertKitInList: (state, action) => {
            const kit = action.payload
            const index = state.list.findIndex((k) => k._id === kit._id)
            if (index >= 0) state.list[index] = kit
            else state.list.unshift(kit)
        },
        removeKitFromList: (state, action) => {
            state.list = state.list.filter((k) => k._id !== action.payload)
        },
        setCurrentKit: (state, action) => {
            state.current = action.payload
            state.currentStatus = "loaded"
        },
        setCurrentKitStatus: (state, action) => {
            state.currentStatus = action.payload
        },
        clearCurrentKit: (state) => {
            state.current = null
            state.currentStatus = "idle"
        }
    }
})

export const {
    setKitList, setKitListStatus, upsertKitInList, removeKitFromList,
    setCurrentKit, setCurrentKitStatus, clearCurrentKit
} = kitSlice.actions

export default kitSlice.reducer
