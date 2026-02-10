cmake_minimum_required(VERSION 3.22)

project(disband-audio-capture
        VERSION 0.1.0
        LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(MSVC)
    add_compile_options(/FS)
endif()

add_subdirectory(JUCE)

juce_add_console_app(disband-audio-capture
    PRODUCT_NAME "Disband Audio Capture"
    VERSION 0.1.0
)

target_sources(disband-audio-capture PRIVATE
    src/main.cpp
)

target_link_libraries(disband-audio-capture PRIVATE
    juce::juce_audio_devices
    juce::juce_audio_utils
    juce::juce_core
)
