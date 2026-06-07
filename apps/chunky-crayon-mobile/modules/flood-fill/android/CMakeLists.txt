cmake_minimum_required(VERSION 3.9.0)
project(FloodFill)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Hand-written C++ implementation.
add_library(FloodFill SHARED
  ../cpp/HybridFloodFiller.hpp
)
set_target_properties(FloodFill PROPERTIES LINKER_LANGUAGE CXX)

target_include_directories(FloodFill PUBLIC "../cpp")

# Pull in all Nitrogen-generated sources + the NitroModules/registerAllNatives glue.
include(${CMAKE_SOURCE_DIR}/../nitrogen/generated/android/FloodFill+autolinking.cmake)
