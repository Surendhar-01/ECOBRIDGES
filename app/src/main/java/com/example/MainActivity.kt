package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.auth.SupabaseAuthService
import com.example.model.AppScreen
import com.example.model.RoleType
import com.example.ui.FormalRecyclerAuthScreen
import com.example.ui.GovernmentAdminAuthScreen
import com.example.ui.InformalCollectorAuthScreen
import com.example.ui.IntroScreen
import com.example.ui.IntroViewModel
import com.example.ui.theme.MyApplicationTheme
import com.example.ui.voice.GlobalVoiceAssistantBar

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MyApplicationTheme {
                MainAppNavHost()
            }
        }
    }
}

@Composable
fun MainAppNavHost(
    viewModel: IntroViewModel = viewModel()
) {
    val currentDestination by viewModel.navigationDestination.collectAsState()
    val currentLanguage by viewModel.selectedLanguage.collectAsState()
    val context = LocalContext.current

    // Sync active screen with centralized VoiceIntentRouter
    LaunchedEffect(currentDestination) {
        val screen = when (currentDestination) {
            null -> AppScreen.INTRO
            RoleType.INFORMAL_COLLECTOR -> AppScreen.INFORMAL_COLLECTOR_AUTH
            RoleType.FORMAL_RECYCLER -> AppScreen.FORMAL_RECYCLER_AUTH
            RoleType.GOVERNMENT_ADMIN -> AppScreen.GOVERNMENT_ADMIN_AUTH
        }
        viewModel.voiceEngine.router.updateScreen(screen, currentDestination)
    }

    // Handle system back navigation when in role authentication.
    // The authenticated session is fully cleared so returning to the portal
    // chooser never re-opens the previous role's dashboard and no session state
    // leaks across roles.
    BackHandler(enabled = currentDestination != null) {
        SupabaseAuthService.getInstance(context).signOut()
        viewModel.navigateBackToIntro()
    }

    Box(modifier = Modifier.fillMaxSize()) {
        when (val role = currentDestination) {
            null -> {
                IntroScreen(
                    viewModel = viewModel,
                    modifier = Modifier.fillMaxSize()
                )
            }
            RoleType.INFORMAL_COLLECTOR -> {
                InformalCollectorAuthScreen(
                    language = currentLanguage,
                    voiceEngine = viewModel.voiceEngine,
                    onBack = { viewModel.navigateBackToIntro() }
                )
            }
            RoleType.FORMAL_RECYCLER -> {
                FormalRecyclerAuthScreen(
                    language = currentLanguage,
                    voiceEngine = viewModel.voiceEngine,
                    onBack = { viewModel.navigateBackToIntro() }
                )
            }
            RoleType.GOVERNMENT_ADMIN -> {
                GovernmentAdminAuthScreen(
                    language = currentLanguage,
                    voiceEngine = viewModel.voiceEngine,
                    onBack = { viewModel.navigateBackToIntro() }
                )
            }
        }

        // Universal Voice Assistant overlay available across all application sections.
        // Hidden on the intro chooser: the intro has its own microphone UI and the
        // reference design (image 2) shows no bottom assistant dock there.
        if (currentDestination != null) {
            GlobalVoiceAssistantBar(
                voiceEngine = viewModel.voiceEngine,
                currentLanguage = currentLanguage,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .navigationBarsPadding()
                    .imePadding()
            )
        }
    }
}

