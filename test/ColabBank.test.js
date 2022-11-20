const {
    time,
    loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");


describe("ColabBank Test Suite", async () => {


    async function deployOneYearLockFixture() {
        const TIME = 60 * 60;
        const ONE_GWEI = 1_000_000_000;

        const lockedAmount = ONE_GWEI;
        const unlockTime = await time.latest() + TIME;

        const currentTime = await time.latest()

        const [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();
        const ColabBank = await ethers.getContractFactory("ColabBank");
        const colabBank = await ColabBank.deploy(unlockTime, { value: lockedAmount });


        return { unlockTime, lockedAmount, owner, addr1, addr2, addr3, addr4, colabBank, currentTime };
    }

    describe("ColabBank Deployment", async () => {
        it("should determine successful deployment", async () => {
            
            const { unlockTime, colabBank, owner } = await loadFixture(deployOneYearLockFixture);
            
            const colabBankOwner = await colabBank.owner()
            console.log("colab bank owner__", colabBankOwner)
            console.log("owner__", owner.address)

            const returnedUnlockTime = await colabBank.unlockTime()
            console.log("returned unlock time_", returnedUnlockTime)

            expect(colabBankOwner).to.eq(owner.address)
            expect(returnedUnlockTime).to.eq(unlockTime)
            expect(returnedUnlockTime).to.be.gte(await time.latest())
            expect(await colabBank.balances(owner.address)).to.eq(0)
            expect(await colabBank.totalColabBalance()).to.eq(0)
        })
    })
    describe("Deposit", async () => {
        it("should successfully deposit an amount", async () => {
            
            const { colabBank, addr1 } = await loadFixture(deployOneYearLockFixture);
            
            const addr1BalanceBeforeDeposit = await colabBank.balances(addr1.address)
            console.log("addr1 bal before__", addr1BalanceBeforeDeposit)
            expect(addr1BalanceBeforeDeposit).to.eq(0)
            expect(colabBank.connect(addr1).deposit(0)).to.be.reverted
           const addr1DepositTxn =  await colabBank.connect(addr1).deposit(5)
            
            const addr1BalanceAfterDeposit = await colabBank.balances(addr1.address)
            expect(addr1BalanceAfterDeposit).to.eq(5)
            console.log("addr1 bal after__", addr1BalanceAfterDeposit)
            
            const totalColabBalance = await colabBank.totalColabBalance()
            console.log("total colab balance__", totalColabBalance)
            expect(totalColabBalance).to.eq(5)

            await expect(addr1DepositTxn).to.emit(colabBank, "Deposit").withArgs(5, anyValue, addr1.address)
        })
    })
    // Adding the withdrawal test (Faith M. Roberts)
    describe("Withdrawal", async () => {
        it("should fail if called before the present time", async () => {
        const { colabBank, addr1, unlockTime } = await loadFixture(deployOneYearLockFixture);
      
        expect(colabBank.withdraw()).to.be.revertedWith("You can't withdraw yet");
              
        // checking for the owner
        await time.increaseTo(unlockTime);
        expect(colabBank.connect(addr1).withdraw()).to.be.revertedWith("You aren't the owner");
        expect(colabBank.withdraw()).not.to.be.reverted;
              
        // checking for successful withdrawal by the owner
        const addr1WithdrawTxn = await colabBank.connect(addr1).withdraw(3);
        expect(addr1WithdrawTxn).to.eq(3);
        
        // checking for update on the total account
        const totalColabBalance = await colabBank.totalColabBalance();
        expect(totalColabBalance).to.eq(2);
            
        // checking the withdraw event
        await expect(addr1WithdrawTxn).to.emit(colabBank, "Withdrawal").withArgs(3, anyValue);
    });    
        // checking the transfer
        await expect(addr1WithdrawTxn).to.changeEtherBalances([owner, colabBank],[3, -3]);
      
    })
    // 
})