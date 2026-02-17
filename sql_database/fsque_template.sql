-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 14, 2026 at 09:42 PM
-- Wersja serwera: 10.4.32-MariaDB
-- Wersja PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `fsque`
--

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `rooms_info`
--

CREATE TABLE `rooms_info` (
  `id` int(11) NOT NULL,
  `name` varchar(1000) NOT NULL,
  `owner` varchar(1000) NOT NULL,
  `privacy` varchar(1000) NOT NULL DEFAULT 'public',
  `password` text NOT NULL,
  `visible` tinyint(1) NOT NULL DEFAULT 1,
  `allowed_users` text NOT NULL,
  `token` text NOT NULL,
  `lastActivity` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `rooms_info`
--

INSERT INTO `rooms_info` (`id`, `name`, `owner`, `privacy`, `password`, `visible`, `allowed_users`, `token`, `lastActivity`) VALUES
(15, 'xd', 'pet', 'public', '', 1, '[\"944419da-8584-45dc-ac32-86a77f2e75c6\"]', 'ea8d4f41-7401-4546-b574-f1c98efe7568', 1771101392);

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `rooms_old`
--

CREATE TABLE `rooms_old` (
  `id` int(11) NOT NULL,
  `name` text NOT NULL,
  `password` text NOT NULL,
  `privacy` text NOT NULL DEFAULT 'public',
  `visible` int(11) NOT NULL DEFAULT 1,
  `owner` text NOT NULL,
  `crt_date` text NOT NULL,
  `room_id` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `stashed_rooms_old`
--

CREATE TABLE `stashed_rooms_old` (
  `id` int(11) NOT NULL,
  `room_id` text NOT NULL,
  `allowed_users` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indeksy dla zrzutów tabel
--

--
-- Indeksy dla tabeli `rooms_info`
--
ALTER TABLE `rooms_info`
  ADD PRIMARY KEY (`id`);

--
-- Indeksy dla tabeli `rooms_old`
--
ALTER TABLE `rooms_old`
  ADD PRIMARY KEY (`id`);

--
-- Indeksy dla tabeli `stashed_rooms_old`
--
ALTER TABLE `stashed_rooms_old`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `rooms_info`
--
ALTER TABLE `rooms_info`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `rooms_old`
--
ALTER TABLE `rooms_old`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stashed_rooms_old`
--
ALTER TABLE `stashed_rooms_old`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
