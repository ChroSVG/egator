import { createBrowserRouter, RouterProvider } from "react-router-dom"
import RootLayout from "./pages/RootLayout"
import ErrorPage from "./pages/ErrorPage"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Congarats from "./pages/Congarats"
import Logout from "./pages/Logout"
import ElectionDetails from "./pages/ElectionDetails"
import Candidates from "./pages/Candidates"
import Elections from "./pages/Elections"
import Result from "./pages/Result"
import ProtectedRoute from "./components/ProtectedRoute"
const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <Login />,
      },
      {
        path: "register",
        element: <Register />,
      },
      {
        path: "login",
        element: <Login />,
      },
      {
        path: "results",
        element: <ProtectedRoute><Result /></ProtectedRoute>,
      },
      {
        path: "elections",
        element: <ProtectedRoute><Elections /></ProtectedRoute>,
      },
      {
        path: "elections/:id",
        element: <ProtectedRoute><ElectionDetails /></ProtectedRoute>,
      },
      {
        path: "elections/:id/candidates",
        element: <ProtectedRoute><Candidates  /></ProtectedRoute>,
      },
      {
        path: "congrats",
        element: <Congarats />,
      },
      {
        path: "logout",
        element: <Logout />,
      },
    ],
  },
])


function App() { 
 return (<RouterProvider router={router} />)
}

export default App
