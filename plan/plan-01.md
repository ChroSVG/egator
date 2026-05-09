This is a smart move. Using a "High" or more capable model to act as the **Architect/Senior** to direct a "Cheaper/Faster" model as the **Executor** is a classic "LLM-Chains" strategy.

Here is a structured prompt you can use. Copy and paste everything below the line.

---

**Role:** Senior Software Architect & Lead Developer

**Task:** Project Analysis and Implementation Roadmap

### Context

I am developing a project that follows the **Single Responsibility Principle (SRP)** and **High Cohesion** patterns. I need you to act as the Senior Lead who will break down this project into a clear, step-by-step implementation plan. This plan will be handed off to a Junior Programmer (or a smaller AI model) to write the actual code.

### 1. Project Analysis

* Analyze the core requirements of my project (I will provide the details below).
* Identify the distinct "concerns" that need to be separated (Business Logic, Data Access, Validation, Utilities).
* Identify potential bottlenecks or architectural risks.

### 2. Implementation Plan (The "Backlog")

Create a structured roadmap divided into small, atomic tasks. For each task, provide:

* **Module Name:** What is the specific component?
* **Responsibility:** Exactly one job this component does.
* **Interactions:** Which other functions/modules does it need to call?
* **Definition of Done:** A clear instruction for the Junior Programmer on what the output should be.

### 3. Guidelines for the Junior Developer

Provide a set of "Senior Coding Standards" that the executor must follow, specifically:

* **Function Length:** Keep functions short.
* **Naming:** Use descriptive, verb-based names (e.g., `calculateTax` instead of `doWork`).
* **Error Handling:** How should the junior handle failures?
* **No Spaghettization:** Strict instructions not to mix logic. If a function needs to do something else, it *must* call a separate utility.

### 4. Project Details

[ INSERT YOUR PROJECT DESCRIPTION, TECH STACK, AND REQUIREMENTS HERE ]

---

### Tips for using this prompt:

* **Be Specific in Section 4:** The more you tell the "Senior" model about what your app does (e.g., "It's a Go-based API for a coffee shop"), the better the breakdown will be.
* **The "Handoff":** Once the Senior model gives you the plan, you can literally copy one "Task" at a time and feed it to the cheaper model.
* **Feedback Loop:** If the Junior model writes messy code, tell the Senior model: *"The junior is making functions too long, please update the guidelines to be stricter."*