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

set(DISBAND_ANALYSIS_SOURCES
    src/analysis/audio_loader.cpp
    src/analysis/judger.cpp
    src/analysis/criterion_judgment.cpp
    src/analysis/session_matching.cpp
    src/analysis/judgment_errors/timing.cpp
    src/analysis/judgment_errors/pitch.cpp
    src/analysis/judgment_errors/session_scan.cpp
    src/analysis/judgment_errors/velocity.cpp
    src/analysis/note_extraction/aubio_extractor.cpp
    src/analysis/note_extraction/preprocess.cpp
    src/analysis/note_extraction/pitch_utils.cpp
    src/analysis/note_extraction/aubio_context.cpp
    src/analysis/note_extraction/segmentation.cpp
)

set(DISBAND_COMMON_AUDIO_LIBS
    juce::juce_audio_devices
    juce::juce_audio_formats
    juce::juce_audio_utils
    juce::juce_gui_basics
    juce::juce_core
    aubio
)

juce_add_console_app(disband-audio-capture
    PRODUCT_NAME "Disband Audio Capture"
    VERSION 0.1.0
)

target_sources(disband-audio-capture PRIVATE
    src/app/capture_main.cpp
)

target_link_libraries(disband-audio-capture PRIVATE
    ${DISBAND_COMMON_AUDIO_LIBS}
)

target_include_directories(disband-audio-capture PRIVATE
    ${CMAKE_SOURCE_DIR}/src
    ${CMAKE_SOURCE_DIR}/aubio/src
)

juce_add_console_app(disband-audio-analyze
    PRODUCT_NAME "Disband Audio Analyze"
    VERSION 0.1.0
)

target_sources(disband-audio-analyze PRIVATE
    src/app/analyze_main.cpp
    ${DISBAND_ANALYSIS_SOURCES}
)

target_link_libraries(disband-audio-analyze PRIVATE
    ${DISBAND_COMMON_AUDIO_LIBS}
)

target_include_directories(disband-audio-analyze PRIVATE
    ${CMAKE_SOURCE_DIR}/src
    ${CMAKE_SOURCE_DIR}/aubio/src
)

add_custom_command(TARGET disband-audio-capture POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E make_directory
        "${CMAKE_SOURCE_DIR}/bin/win32"
    COMMAND ${CMAKE_COMMAND} -E copy
        $<TARGET_FILE:disband-audio-capture>
        "${CMAKE_SOURCE_DIR}/bin/win32/disband-audio-capture.exe"
)

add_custom_command(TARGET disband-audio-analyze POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E make_directory
        "${CMAKE_SOURCE_DIR}/bin/win32"
    COMMAND ${CMAKE_COMMAND} -E copy
        $<TARGET_FILE:disband-audio-analyze>
        "${CMAKE_SOURCE_DIR}/bin/win32/disband-audio-analyze.exe"
)
