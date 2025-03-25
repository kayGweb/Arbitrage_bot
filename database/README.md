# [database]

## Purpose

## Brief description of what this directory contains and its role in the project.

This is the Database the persistant storage of raw data to facilitate the overall function of the application. SQLlite database is used.

## Key Files

-   `db.js`: Database class used to interface with the SQLlite database
-   `database-schema.sql`: The database schema for the SQLlite database
-   `arvitrage.db`: SQLlite database
-   `schema.sql`: Database schema for multi-chain DEX arbitrage

## Architecture

## Brief explanation of how the components in this directory interact with each other and the rest of the application.

This is the datasource for the application. The interface is created to ease the use of the database within the application and set an interface to be copied if the need to upgrade to another datasource we can use the same methods as the db.js file.

## Usage Examples

## Simple examples of how these components are used.
