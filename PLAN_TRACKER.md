# Implementation Plan: Google Docs & Video Upload Support - Tracker

> **Status**: ALL MILESTONES COMPLETE (85 tests passing - Backend M1: 24, M2: 11, M3: 13, M6: 9 | Frontend M4: 23, M5: 5)

## Milestone 1: Backend - Unified Media Processing Core
- [x] Task 1.1: Extend `CodingSession` model (`src/models/session.py`)
- [x] Task 1.2: Add new Gemini client methods (`src/services/gemini_client.py`)
- [x] Task 1.3: Create tailored extraction prompts (`src/services/extraction_prompts.py`)
- [x] Task 1.4: Create document parser (`src/services/document_parser.py`)
- [x] Task 1.5: Create unified `MediaProcessor` service (`src/services/media_processor.py`)
- [x] Task 1.6: Update `audio_processor.py` to use extracted prompts
- [x] Task 1.7: Add config settings (`src/config.py`)
- [x] Task 1.8: Milestone 1 tests

## Milestone 2: Backend - Video & Document Upload Endpoints
- [x] Task 2.1: Add `POST /sessions/upload-video` endpoint
- [x] Task 2.2: Add `POST /sessions/upload-document` endpoint
- [x] Task 2.3: Update `SessionResponse` schema
- [x] Task 2.4: Update `reprocess` endpoint
- [x] Task 2.5: Milestone 2 tests

## Milestone 3: Backend - Google OAuth & Drive Integration
- [x] Task 3.1: Create `GoogleOAuthToken` model
- [x] Task 3.2: Create `GoogleAuthService`
- [x] Task 3.3: Create Google OAuth API endpoints
- [x] Task 3.4: Update `.env.example`
- [x] Task 3.5: Milestone 3 tests

## Milestone 4: Frontend - Video & Document Upload Components
- [x] Task 4.1: Add API functions (`frontend/src/lib/api.ts`)
- [x] Task 4.2: Create `VideoUploader` component
- [x] Task 4.3: Create `DocumentUploader` component
- [x] Task 4.4: Expand dashboard tabs
- [x] Task 4.5: Set up frontend testing
- [x] Task 4.6: Milestone 4 tests

## Milestone 5: Frontend - Google Docs Integration UI
- [x] Task 5.1: Create `GoogleDocsImporter` component
- [x] Task 5.2: Create `DriveFilePicker` sub-component
- [x] Task 5.3: Create `GoogleConnectPrompt` sub-component
- [x] Task 5.4: Create OAuth callback page
- [x] Task 5.5: Wire into dashboard
- [x] Task 5.6: Milestone 5 tests

## Milestone 6: End-to-End Integration Tests
- [x] Integration test: Video pipeline
- [x] Integration test: Document pipeline
- [x] Integration test: Google Docs pipeline
