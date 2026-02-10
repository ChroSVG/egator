import Thumbnaill from './assets/flag1.jpg'
import Thumbnail2 from './assets/flag2.jpg'
import Thumbnail3 from './assets/flag3.png'
import Candidatel from './assets/candidate1.jpg'
import Candidate2 from './assets/candidate2.jpg'
import Candidate3 from './assets/candidate3.jpg'
import Candidate4 from './assets/candidate4.jpg'
import Candidate5 from './assets/candidate5.jpg'
import Candidate6 from './assets/candidate6.jpg'
import Candidate7 from './assets/candidate7.jpg'

export const elections = [
    {
        id: "e1",
        title: "Harvard Presidential Elections 2024",
        description: "Provident similique accusantium nemo autem. Veritatis obcaecati tenetur iure eius earum ut molestias architecto voluptate aliquam nihil, eveniet aliquid culpa officia aut! Impedit sit sunt quaerat, odit, tenetur error, harum nesciunt ipsum debitis quasaliquid.",
        thumbnail: Thumbnaill,
        candidates: ["c1", "c2", "c3", "c4"],
        voters: ["voter1", "voter2", "voter3", "voter4"]
    },
    {
        id: "e2",
        title: "MIT Student Union Elections",
        description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
        thumbnail: Thumbnail2,
        candidates: ["c5", "c6"],
        voters: ["voter5", "voter6"]
    },
    {
        id: "e3",
        title: "Stanford Class Representative",
        description: "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
        thumbnail: Thumbnail3,
        candidates: ["c7"],
        voters: ["voter7"]
    }
]

export const candidates = [
    {
        id: "c1",
        fullName: "Enoch Ganyo",
        image: Candidatel,
        motto: "Sed quibusdam recusandae alias error harum maxime adipisci amet laborum.",
        voteCount: 23,
        election: "e1",
    },
    {
        id: "c2",
        fullName: "John Asiama",
        image: Candidate2,
        motto: "Sed quibusdam recusandae alias error harum maxime adipisci amet laborum.",
        voteCount: 18,
        election: "e1"
    },
    {
        id: "c3",
        fullName: "Jane Doe",
        image: Candidate3,
        motto: "A new vision for a brighter future.",
        voteCount: 45,
        election: "e1"
    },
    {
        id: "c4",
        fullName: "Peter Jones",
        image: Candidate4,
        motto: "Experience and leadership you can trust.",
        voteCount: 31,
        election: "e1"
    },
    {
        id: "c5",
        fullName: "Mary Anne",
        image: Candidate5,
        motto: "Progress, innovation, and community.",
        voteCount: 52,
        election: "e2"
    },
    {
        id: "c6",
        fullName: "David Smith",
        image: Candidate6,
        motto: "Your voice for change.",
        voteCount: 29,
        election: "e2"
    },
    {
        id: "c7",
        fullName: "Emily White",
        image: Candidate7,
        motto: "Dedicated to serving the students.",
        voteCount: 68,
        election: "e3"
    }
]

export const voters = [
    {
        id: 'voter1',
        fullName: 'Clark Kent',
        email: 'clark.kent@dailyplanet.com',
        password: 'krypton',
        isAdmin: false,
        votedElections: ['e1']
    },
    {
        id: 'voter2',
        fullName: 'Bruce Wayne',
        email: 'bruce@wayne-enterprises.com',
        password: 'gotham',
        isAdmin: true,
        votedElections: ['e1']
    },
    {
        id: 'voter3',
        fullName: 'Diana Prince',
        email: 'diana@themyscira.org',
        password: 'amazon',
        isAdmin: false,
        votedElections: ['e1']
    },
    {
        id: 'voter4',
        fullName: 'Barry Allen',
        email: 'barry.allen@ccpd.gov',
        password: 'speedforce',
        isAdmin: false,
        votedElections: ['e1']
    },
    {
        id: 'voter5',
        fullName: 'Arthur Curry',
        email: 'arthur@atlantis.net',
        password: 'mera',
        isAdmin: false,
        votedElections: ['e2']
    },
    {
        id: 'voter6',
        fullName: 'Victor Stone',
        email: 'victor.stone@starlabs.com',
        password: 'booyah',
        isAdmin: false,
        votedElections: ['e2']
    },
    {
        id: 'voter7',
        fullName: 'Hal Jordan',
        email: 'hal.jordan@greenlanterncorps.org',
        password: 'willpower',
        isAdmin: false,
        votedElections: ['e3']
    }
]
