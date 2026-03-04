cmake_minimum_required(VERSION 3.22)

if(POLICY CMP0091)
    cmake_policy(SET CMP0091 NEW)
endif()

set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>DLL")

project(disband-audio-engine
        VERSION 0.1.0
        LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(MSVC)
    add_compile_options(/FS)
endif()

add_subdirectory(JUCE)
add_subdirectory(aubio/src)

if(MSVC)
    target_compile_definitions(aubio PRIVATE HAVE_WIN_HACKS=1)
    target_compile_definitions(aubio PRIVATE HAVE_C99_VARARGS_MACROS=1)
endif()

juce_add_console_app(disband-audio-engine
    PRODUCT_NAME "Disband Audio Engine"
    VERSION 0.1.0
)

target_sources(disband-audio-engine PRIVATE
    src/app/main.cpp
    src/analysis/audio_loader.cpp
    src/analysis/judger.cpp
    src/analysis/session_matching.cpp
    src/analysis/judgment_errors/timing.cpp
    src/analysis/judgment_errors/pitch.cpp
    src/analysis/note_extraction/aubio_extractor.cpp
    src/analysis/note_extraction/preprocess.cpp
    src/analysis/note_extraction/pitch_utils.cpp
    src/analysis/note_extraction/aubio_context.cpp
    src/analysis/note_extraction/segmentation.cpp
)

target_link_libraries(disband-audio-engine PRIVATE
    juce::juce_audio_devices
    juce::juce_audio_formats
    juce::juce_audio_utils
    juce::juce_gui_basics
    juce::juce_core
    aubio
)

target_include_directories(disband-audio-engine PRIVATE
    ${CMAKE_SOURCE_DIR}/src
    ${CMAKE_SOURCE_DIR}/aubio/src
)

add_custom_command(TARGET disband-audio-engine POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E make_directory
        "${CMAKE_SOURCE_DIR}/bin/win32"
    COMMAND ${CMAKE_COMMAND} -E copy
        $<TARGET_FILE:disband-audio-engine>
        "${CMAKE_SOURCE_DIR}/bin/win32/disband-audio-engine.exe"
)
